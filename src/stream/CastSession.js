import mpegts from 'mpegts.js';

// Mirrors the PICO web client (http://<ip>:3342/cast): cast_status -> cast_initiative ->
// GET /test.flv -> cast_succeeded, then cast_status every 3s while playing.

const PORT = 3342;
const POLL_MS = 3000;
const RETRY_MS = 5000;
const STALL_MS = 10000;
const MAX_LATENCY_S = 3;

// Buffer target in seconds; this is what "quality" changes in the web client (desktop values).
export const QUALITY_PRELOAD = { standard: 0.2, smooth: 0.5 };

const StatusCode = { SUCCESS: 0, CONTINUE: 1, INTERACTIVE: -1, ALREADY_CONNECT: -2, ERROR: -3 };
const InitiativeCode = { SUCCESS: 0, ERROR: 1, DEVICE_BUSY: -2 };

const api = window.pico;

export class CastSession {
  constructor(headset, onActiveChange) {
    this.ip = headset.ip;
    this.preload = QUALITY_PRELOAD[headset.quality] ?? QUALITY_PRELOAD.standard;
    this.onActiveChange = onActiveChange;
    this.listeners = new Set();
    this.state = { status: 'idle', message: '', deviceName: '', sn: '', wanted: false };

    this.player = null;
    this.connected = false; // initiative succeeded and not yet terminated
    this.runId = 0; // bumps on every start/stop so stale async work can bail out
    this.pollTimer = null;
    this.retryTimer = null;
    this.stallTimer = null;
    this.lastRtt = 0;
    this.lastProgress = 0;

    this.video = document.createElement('video');
    this.video.className = 'stream-video';
    this.video.playsInline = true;
    this.video.autoplay = true;
    this.video.muted = headset.muted;
    this.video.volume = headset.volume ?? 1;
    this.video.addEventListener('timeupdate', () => this.chaseLatency());
    this.video.addEventListener('playing', () => this.onPlaying());
  }

  // --- subscription (used with React's useSyncExternalStore) ---
  subscribe = (fn) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = () => this.state;

  set(patch) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn());
  }

  // --- settings ---
  setQuality(quality) {
    this.preload = QUALITY_PRELOAD[quality] ?? QUALITY_PRELOAD.standard;
  }

  setMuted(muted) {
    this.video.muted = muted;
  }

  setVolume(volume) {
    this.video.volume = volume;
  }

  async setIp(ip) {
    if (ip === this.ip) return;
    const wanted = this.state.wanted;
    await this.stop();
    this.ip = ip;
    this.set({ deviceName: '', sn: '' });
    if (wanted) this.start();
  }

  // --- lifecycle ---
  start() {
    if (this.state.wanted) return;
    this.runId++;
    this.set({ wanted: true });
    this.connect(this.runId);
  }

  // Skip the pending retry delay and reconnect immediately.
  retryNow() {
    if (!this.state.wanted || this.player) return;
    this.runId++;
    this.connect(this.runId);
  }

  async stop() {
    this.runId++;
    this.clearTimers();
    this.destroyPlayer();
    this.set({ wanted: false, status: 'idle', message: '' });
    await this.release();
  }

  async restart() {
    await this.stop();
    // Ask the headset to drop whoever is casting, then reconnect.
    await api.termination(this.ip, this.state.deviceName);
    this.start();
  }

  async dispose() {
    await this.stop();
    this.video.remove();
    this.listeners.clear();
  }

  // --- internals ---
  async connect(run) {
    this.clearTimers();
    this.set({ status: 'connecting', message: '' });

    const st = await api.status(this.ip);
    if (run !== this.runId) return;
    if (!st.ok) return this.fail('offline', 'msg.unreachable', run);
    if (st.data) this.set({ deviceName: st.data.device_name || '', sn: st.data.sn || '' });

    if (st.code === StatusCode.ALREADY_CONNECT) {
      return this.fail('busy', 'msg.otherViewer', run);
    }
    if (![StatusCode.SUCCESS, StatusCode.CONTINUE, StatusCode.INTERACTIVE].includes(st.code)) {
      return this.fail('error', 'msg.statusError', run);
    }
    if (st.code === StatusCode.INTERACTIVE) {
      this.set({ status: 'waiting', message: 'msg.accept' });
    }

    const init = await api.initiative(this.ip, this.state.deviceName);
    if (run !== this.runId) return;
    if (!init.ok) return this.fail('offline', 'msg.unreachable', run);
    if (init.code === InitiativeCode.DEVICE_BUSY) {
      return this.fail('busy', 'msg.busy', run);
    }
    if (init.code !== InitiativeCode.SUCCESS) {
      return this.fail('error', 'msg.notStarted', run);
    }

    this.connected = true;
    this.reportActive();
    this.createPlayer(run);
  }

  createPlayer(run) {
    this.destroyPlayer();
    const player = mpegts.createPlayer(
      { type: 'flv', isLive: true, url: `http://${this.ip}:${PORT}/test.flv` },
      {
        enableWorker: false,
        enableStashBuffer: false,
        stashInitialSize: 128,
        lazyLoad: false,
        autoCleanupSourceBuffer: true,
        liveBufferLatencyChasing: false,
      },
    );
    player.on(mpegts.Events.ERROR, () => {
      if (run === this.runId) this.checkStatus(run, true);
    });
    player.on(mpegts.Events.LOADING_COMPLETE, () => {
      if (run !== this.runId) return;
      api.failed(this.ip, this.state.deviceName);
      this.checkStatus(run, true);
    });
    player.attachMediaElement(this.video);
    player.load();
    this.player = player;
    this.firstPlay = true;
    this.lastProgress = Date.now();
    this.video.play().catch(() => {});

    this.pollTimer = setInterval(() => this.checkStatus(run, false), POLL_MS);
    this.stallTimer = setInterval(() => {
      if (Date.now() - this.lastProgress > STALL_MS) this.checkStatus(run, true);
    }, 2000);
  }

  onPlaying() {
    if (!this.player) return;
    if (this.firstPlay) {
      this.firstPlay = false;
      api.succeeded(this.ip, this.state.deviceName);
    }
    this.set({ status: 'playing', message: '' });
  }

  async checkStatus(run, playerFailed) {
    const t0 = Date.now();
    const st = await api.status(this.ip, this.lastRtt);
    if (run !== this.runId) return;
    this.lastRtt = Date.now() - t0;

    if (!st.ok) return this.fail('offline', 'msg.lost', run);
    const alive = st.code === StatusCode.CONTINUE || st.code === StatusCode.ALREADY_CONNECT;
    if (!alive) return this.fail('ended', 'msg.ended', run);
    if (playerFailed) {
      // Server still casting but our pipe broke: rebuild the player.
      this.clearTimers();
      this.createPlayer(run);
    }
  }

  chaseLatency() {
    const v = this.video;
    this.lastProgress = Date.now();
    if (!v.buffered.length) return;
    const behind = v.buffered.end(v.buffered.length - 1) - v.currentTime;
    if (behind > MAX_LATENCY_S) {
      v.currentTime = v.buffered.end(v.buffered.length - 1) - this.preload;
    } else {
      v.playbackRate = behind > this.preload ? 1.1 : 1;
    }
  }

  fail(status, message, run) {
    this.clearTimers();
    this.destroyPlayer();
    this.connected = false;
    this.reportActive();
    this.set({ status, message });
    if (this.state.wanted) {
      this.retryTimer = setTimeout(() => {
        if (run === this.runId) this.connect(run);
      }, RETRY_MS);
    }
  }

  async release() {
    if (!this.connected) return;
    this.connected = false;
    this.reportActive();
    await api.termination(this.ip, this.state.deviceName);
  }

  destroyPlayer() {
    if (!this.player) return;
    const p = this.player;
    this.player = null;
    try {
      p.pause();
      p.unload();
      p.detachMediaElement();
      p.destroy();
    } catch {
      // Player may already be torn down after an error.
    }
    this.video.removeAttribute('src');
    this.video.load();
  }

  clearTimers() {
    clearInterval(this.pollTimer);
    clearInterval(this.stallTimer);
    clearTimeout(this.retryTimer);
    this.pollTimer = this.stallTimer = this.retryTimer = null;
  }

  reportActive() {
    this.onActiveChange?.();
  }
}
