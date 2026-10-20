import { useCastSession } from '../hooks/useCastSession.js';
import { useT } from '../i18n.jsx';
import { getSession } from '../stream/sessionManager.js';
import { closeApp, useAgent } from '../agent/agentManager.js';
import { jobText, jobTone } from '../agent/agentText.js';
import KebabMenu from './KebabMenu.jsx';
import StatusOverlay, { StatusBadge } from './StatusOverlay.jsx';
import VideoSlot from './VideoSlot.jsx';
import { BatteryIcon, ExpandIcon, MuteIcon, StopIcon, VolumeIcon } from './icons.jsx';

export default function HeadsetTile({ headset, focused, onFocus, onUpdate, onDialog, onDelete }) {
  const t = useT();
  const session = getSession(headset.id);
  const state = useCastSession(session);
  const agent = useAgent(headset.id);
  const live = state.status === 'playing';
  const stop = (fn) => (e) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div className={`tile status-${state.status} ${state.wanted ? 'wanted' : ''}`} onClick={() => state.wanted && onFocus(headset.id)}>
      <div className="tally" />
      <div className="tile-media">
        {focused ? (
          <div className="status-overlay">
            <ExpandIcon width={20} height={20} />
            <div className="status-text">{t('tile.inFocus')}</div>
          </div>
        ) : (
          <>
            <VideoSlot session={session} ratio={headset.ratio} />
            <StatusOverlay session={session} state={state} />
          </>
        )}
      </div>

      <div className="tile-top">
        {state.wanted ? <StatusBadge status={state.status} /> : <span />}
        <div className="tile-actions">
          {live && !focused && (
            <button
              className="glass-btn"
              title={headset.muted ? t('tile.unmute') : t('tile.mute')}
              onClick={stop(() => onUpdate(headset.id, { muted: !headset.muted }))}
            >
              {headset.muted ? <MuteIcon /> : <VolumeIcon />}
            </button>
          )}
          {state.wanted && (
            <button className="glass-btn" title={t('tile.stop')} onClick={stop(() => session?.stop())}>
              <StopIcon width={12} height={12} />
            </button>
          )}
          <KebabMenu
            agentOnline={agent?.online}
            appRunning={!!agent?.foreground}
            onApps={() => onDialog({ mode: 'apps', targets: [headset] })}
            onCloseApp={() => closeApp([headset])}
            onRename={() => onDialog({ mode: 'rename', headset })}
            onChangeIp={() => onDialog({ mode: 'ip', headset })}
            onRestart={() => session?.restart()}
            onDelete={() => onDelete(headset.id)}
          />
        </div>
      </div>

      <div className="tile-bottom">
        <div className="tile-info">
          <div className="tile-name" title={state.deviceName || undefined}>
            {headset.name}
          </div>
          <div className="tile-ip">{headset.ip}</div>
        </div>
        <AgentInfo agent={agent} />
      </div>
    </div>
  );
}

// Current app and battery reported by the headset's control agent; an install / delete replaces the app.
function AgentInfo({ agent }) {
  const t = useT();
  if (!agent) return null;
  if (!agent.online) return <div className="tile-agent off">{t('agent.offline')}</div>;
  const low = agent.battery <= 20 && !agent.charging;
  return (
    <div className="tile-agent">
      <span className={`battery ${low ? 'low' : ''} ${agent.charging ? 'charging' : ''}`} title={t('agent.battery')}>
        <BatteryIcon width={14} height={14} /> {agent.battery}%
      </span>
      {agent.job ? (
        <span className={`app-pill job ${jobTone(agent.job)}`} title={jobText(t, agent.job)}>
          {jobText(t, agent.job)}
        </span>
      ) : (
        <span className={`app-pill ${agent.foreground ? 'on' : ''}`} title={agent.foreground?.package}>
          {agent.foreground ? agent.foreground.label : t('agent.home')}
          {agent.asleep && <span className="asleep"> · {t('agent.asleep')}</span>}
        </span>
      )}
    </div>
  );
}
