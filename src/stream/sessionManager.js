import { CastSession } from './CastSession.js';

// One CastSession per headset id, kept outside React so streams survive re-renders.
const sessions = new Map();

function reportActive() {
  const casts = {};
  for (const s of sessions.values()) {
    if (s.connected) casts[s.ip] = s.state.deviceName;
  }
  window.pico?.setActive(casts);
}

export function getSession(id) {
  return sessions.get(id);
}

// Reconcile sessions with the persisted headset list.
export function syncSessions(headsets) {
  const ids = new Set(headsets.map((h) => h.id));
  for (const [id, s] of sessions) {
    if (!ids.has(id)) {
      sessions.delete(id);
      s.dispose();
    }
  }
  for (const h of headsets) {
    let s = sessions.get(h.id);
    if (!s) {
      s = new CastSession(h, reportActive);
      sessions.set(h.id, s);
    }
    s.setIp(h.ip);
    s.setQuality(h.quality);
    s.setMuted(h.muted);
    s.setVolume(h.volume ?? 1);
  }
  reportActive();
}

export function enableAll() {
  for (const s of sessions.values()) s.start();
}

export function disableAll() {
  for (const s of sessions.values()) if (s.state.wanted) s.stop();
}
