import { LANGUAGES, useT } from '../i18n.jsx';
import { GridLargeIcon, GridMediumIcon, GridSmallIcon, HeadsetIcon, PlayIcon, PlusIcon, StopIcon } from './icons.jsx';

const SIZES = [
  ['sm', GridSmallIcon],
  ['md', GridMediumIcon],
  ['lg', GridLargeIcon],
];

export default function TopBar({ live, total, tileSize, onTileSize, lang, onLang, onAdd, onEnableAll, onDisableAll }) {
  const t = useT();
  return (
    <header className="topbar">
      <div className="brand">
        <div className="logo">
          <HeadsetIcon width={18} height={18} />
        </div>
        <span className="brand-name">PicoSchoolStream</span>
        <span className={`live-pill ${live ? 'on' : ''}`}>
          <span className="badge-dot" />
          {t('app.live', { n: live })} <span className="of">{t('app.of', { n: total })}</span>
        </span>
      </div>

      <div className="topbar-actions">
        <div className="segmented" role="group" aria-label={t('app.language')}>
          {LANGUAGES.map(([v, label]) => (
            <button key={v} className={lang === v ? 'active' : ''} onClick={() => onLang(v)}>
              {label}
            </button>
          ))}
        </div>
        <div className="segmented" role="group">
          {SIZES.map(([v, Icon]) => (
            <button key={v} title={t(`app.size.${v}`)} className={tileSize === v ? 'active' : ''} onClick={() => onTileSize(v)}>
              <Icon width={15} height={15} />
            </button>
          ))}
        </div>
        <div className="divider" />
        <button className="ghost-btn" onClick={onEnableAll}>
          <PlayIcon width={12} height={12} /> {t('app.enableAll')}
        </button>
        <button className="ghost-btn" onClick={onDisableAll}>
          <StopIcon width={11} height={11} /> {t('app.disableAll')}
        </button>
        <button className="primary-btn" onClick={onAdd}>
          <PlusIcon width={14} height={14} /> {t('app.add')}
        </button>
      </div>
    </header>
  );
}
