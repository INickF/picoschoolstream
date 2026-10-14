import { useEffect, useRef, useState } from 'react';
import { useCastSession } from '../hooks/useCastSession.js';
import { getSession } from '../stream/sessionManager.js';
import { useT } from '../i18n.jsx';
import StatusOverlay, { StatusBadge } from './StatusOverlay.jsx';
import VideoSlot from './VideoSlot.jsx';
import { BackIcon, ExpandIcon, MuteIcon, StopIcon, VolumeIcon } from './icons.jsx';

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

export default function FocusView({ headset, onClose, onUpdate }) {
  const t = useT();
  const session = getSession(headset.id);
  const state = useCastSession(session);
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
      if (e.key === 'Escape') onClose();
      // e.code is layout-independent, so M also works on a Russian keyboard.
      if (e.code === 'KeyM') onUpdate(headset.id, { muted: !headset.muted });
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(hideTimer.current);
    };
  }, [headset.id, headset.muted, onClose, onUpdate]);

  const set = (patch) => onUpdate(headset.id, patch);

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
