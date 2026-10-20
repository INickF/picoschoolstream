import { useEffect, useRef, useState } from 'react';
import { useCastSession } from '../hooks/useCastSession.js';
import { getSession } from '../stream/sessionManager.js';
import { closeApp, useAgent } from '../agent/agentManager.js';
import { errorText, jobText, jobTone } from '../agent/agentText.js';
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
    if (!res.ok) setAppError(errorText(t, res.error));
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
        <div className="group tone-quality" role="group" title={t('focus.quality')} aria-label={t('focus.quality')}>
          <Segmented
            value={headset.quality}
            options={[
              ['standard', t('focus.standard')],
              ['smooth', t('focus.smooth')],
            ]}
            onChange={(quality) => set({ quality })}
          />
        </div>
        <div className="group tone-ratio" role="group" title={t('focus.ratio')} aria-label={t('focus.ratio')}>
          <Segmented
            value={headset.ratio}
            options={[
              ['16:9', '16:9'],
              ['1:1', '1:1'],
            ]}
            onChange={(ratio) => set({ ratio })}
          />
        </div>
        <div className={`group tone-volume ${headset.muted ? 'muted' : ''}`}>
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
        <div className="group focus-app tone-app" role="group" title={t('focus.app')} aria-label={t('focus.app')}>
          {agent?.online && agent.job && !appError ? (
            <span className={`app-pill job ${jobTone(agent.job)}`} title={jobText(t, agent.job)}>
              {jobText(t, agent.job)}
            </span>
          ) : (
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
          )}
          <button
            className="bar-btn apps"
            title={t('menu.apps')}
            disabled={!agent?.online}
            onClick={() => onDialog({ mode: 'apps', targets: [headset] })}
          >
            <AppsIcon width={15} height={15} /> {t('focus.appsBtn')}
          </button>
          <button className="bar-btn close" title={t('menu.closeApp')} disabled={!agent?.foreground} onClick={closeCurrentApp}>
            <CloseIcon width={14} height={14} /> {t('focus.closeAppBtn')}
          </button>
        </div>
        <div className="group">
          {state.wanted && (
            <button className="bar-btn stop" title={t('tile.stop')} onClick={() => session?.stop()}>
              <StopIcon width={11} height={11} /> {t('focus.stopBtn')}
            </button>
          )}
          <button className="bar-btn icon" title={t('focus.fullscreen')} onClick={() => window.pico.toggleFullscreen()}>
            <ExpandIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
