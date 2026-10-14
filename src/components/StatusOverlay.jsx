import { useT } from '../i18n.jsx';
import { PlayIcon, RefreshIcon } from './icons.jsx';

export function StatusBadge({ status }) {
  const t = useT();
  return (
    <span className={`badge ${status}`}>
      <span className="badge-dot" />
      {t(`status.${status}`)}
    </span>
  );
}

// Centered content over a tile/focus view when the stream is not playing.
export default function StatusOverlay({ session, state, large = false }) {
  const t = useT();
  if (state.status === 'playing') return null;
  const stop = (fn) => (e) => {
    e.stopPropagation();
    fn();
  };

  if (!state.wanted) {
    return (
      <div className="status-overlay">
        <button className={`play-btn ${large ? 'large' : ''}`} title={t('tile.start')} onClick={stop(() => session.start())}>
          <PlayIcon width={large ? 26 : 20} height={large ? 26 : 20} />
        </button>
        {large && <div className="status-text">{t('tile.start')}</div>}
      </div>
    );
  }

  const pending = state.status === 'connecting' || state.status === 'waiting';
  return (
    <div className="status-overlay">
      {pending && <div className="spinner" />}
      <div className="status-text">{t(state.message || `status.${state.status}`)}</div>
      {!pending && (
        <button className="chip-btn" onClick={stop(() => session.retryNow())}>
          <RefreshIcon width={13} height={13} /> {t('tile.retry')}
        </button>
      )}
    </div>
  );
}
