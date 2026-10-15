import { useEffect, useRef, useState } from 'react';
import { useCastSession } from '../hooks/useCastSession.js';
import { getSession } from '../stream/sessionManager.js';
import { closeApp, useAgent } from '../agent/agentManager.js';
import { useT } from '../i18n.jsx';
import StatusOverlay, { StatusBadge } from './StatusOverlay.jsx';
import VideoSlot from './VideoSlot.jsx';
import { AppsIcon, BackIcon, BatteryIcon, CloseIcon, ExpandIcon, MuteIcon, StopIcon, VolumeIcon } from './icons.jsx';

const HIDE_MS = 3000;

function Segmented({ value, options, onChange }) {
  return (
    <div className="segmented">
      {options.map(([v, label]) => (
        <button key={v} className={v === value ? 'active' : ''} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export default function FocusView({ headset, dialogOpen, onClose, onUpdate, onDialog }) {
  const t = useT();
  const session = getSession(headset.id);
  const state = useCastSession(session);
  const agent = useAgent(headset.id);
  const [appError, setAppError] = useState('');
  const [controls, setControls] = useState(true);
  const hideTimer = useRef(null);

  const poke = () => {
    setControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControls(false), HIDE_MS);
  };

  useEffect(() => {
    poke();
    const onKey = (e) => {
      // Keys belong to the dialog while one is open over the focus view.
      if (dialogOpen) return;
      if (e.key === 'Escape') onClose();
      // e.code is layout-independent, so M also works on a Russian keyboard.
      if (e.code === 'KeyM') onUpdate(headset.id, { muted: !headset.muted });
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(hideTimer.current);
    };
  }, [headset.id, headset.muted, dialogOpen, onClose, onUpdate]);

  const set = (patch) => onUpdate(headset.id, patch);

  useEffect(() => {
    if (!appError) return;
    const timer = setTimeout(() => setAppError(''), 5000);
    return () => clearTimeout(timer);
  }, [appError]);

  const closeCurrentApp = async () => {
    setAppError('');
    const [{ res }] = await closeApp([headset]);
    if (!res.ok) {
      const key = `agentErr.${res.error}`;
      setAppError(t(key) === key ? res.error : t(key));
    }
  };

  return (
    <div className={`focus ${controls ? '' : 'hide-controls'}`} onMouseMove={poke}>
      <div className="focus-stage">
        <VideoSlot session={session} ratio={headset.ratio} />
        <StatusOverlay session={session} state={state} large />
      </div>

      <div className="focus-bar top">
        <button className="glass-btn round" onClick={onClose} title={t('focus.back')}>
          <BackIcon />
        </button>
        <div className="focus-title">
          <span className="focus-name">{headset.name}</span>
          <span className="focus-meta">
            {headset.ip}
            {state.deviceName && <span>{state.deviceName}</span>}
          </span>
        </div>
        <StatusBadge status={state.status} />
        {agent?.online && (
          <span className={`badge battery ${agent.battery <= 20 && !agent.charging ? 'low' : ''} ${agent.charging ? 'charging' : ''}`} title={t('agent.battery')}>
            <BatteryIcon width={14} height={14} /> {agent.battery}%
          </span>
        )}
      </div>

      <div className="focus-bar bottom">
        <div className="group">
          <span className="label">{t('focus.quality')}</span>
          <Segmented
            value={headset.quality}
            options={[
              ['standard', t('focus.standard')],
              ['smooth', t('focus.smooth')],
            ]}
            onChange={(quality) => set({ quality })}
          />
        </div>
        <div className="group">
          <span className="label">{t('focus.ratio')}</span>
          <Segmented
            value={headset.ratio}
            options={[
              ['16:9', '16:9'],
              ['1:1', '1:1'],
            ]}
            onChange={(ratio) => set({ ratio })}
          />
        </div>
        <div className="group">
          <button
            className="glass-btn"
            title={`${headset.muted ? t('tile.unmute') : t('tile.mute')} (M)`}
            onClick={() => set({ muted: !headset.muted })}
          >
            {headset.muted ? <MuteIcon /> : <VolumeIcon />}
          </button>
          <input
            className="volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={headset.muted ? 0 : headset.volume ?? 1}
            onChange={(e) => {
              const volume = Number(e.target.value);
              set({ volume, muted: volume === 0 });
            }}
          />
        </div>
        <div className="bar-divider" />
        <div className="group focus-app">
          <span className="label">{t('focus.app')}</span>
          <span
            className={`app-pill ${agent?.foreground ? 'on' : ''} ${appError ? 'error' : ''}`}
            title={appError || agent?.foreground?.package}
          >
            {appError
              ? appError
              : !agent?.online
                ? t('agent.offline')
                : agent.foreground
                  ? agent.foreground.label
                  : t('agent.home')}
            {agent?.online && agent.asleep && !appError && <span className="asleep"> · {t('agent.asleep')}</span>}
          </span>
          <button
            className="glass-btn"
            title={t('menu.apps')}
            disabled={!agent?.online}
            onClick={() => onDialog({ mode: 'apps', targets: [headset] })}
          >
            <AppsIcon />
          </button>
          <button className="glass-btn" title={t('menu.closeApp')} disabled={!agent?.foreground} onClick={closeCurrentApp}>
            <CloseIcon />
          </button>
        </div>
        <div className="bar-divider" />
        {state.wanted && (
          <button className="glass-btn" title={t('tile.stop')} onClick={() => session?.stop()}>
            <StopIcon width={12} height={12} />
          </button>
        )}
        <button className="glass-btn" title={t('focus.fullscreen')} onClick={() => window.pico.toggleFullscreen()}>
          <ExpandIcon />
        </button>
      </div>
    </div>
  );
}
