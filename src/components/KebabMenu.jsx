import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n.jsx';
import { DotsIcon } from './icons.jsx';

export default function KebabMenu({ onApps, onCloseApp, agentOnline, appRunning, onRename, onChangeIp, onRestart, onDelete }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setConfirm(false);
  }, [open]);

  const pick = (fn) => (e) => {
    e.stopPropagation();
    setOpen(false);
    fn();
  };

  return (
    <div className={`kebab ${open ? 'open' : ''}`} ref={ref} onClick={(e) => e.stopPropagation()}>
      <button className="glass-btn" title={t('tile.options')} onClick={() => setOpen((o) => !o)}>
        <DotsIcon />
      </button>
      {open && (
        <div className="menu">
          <button disabled={!agentOnline} onClick={pick(onApps)}>{t('menu.apps')}</button>
          <button disabled={!appRunning} onClick={pick(onCloseApp)}>{t('menu.closeApp')}</button>
          <div className="menu-sep" />
          <button onClick={pick(onRename)}>{t('menu.rename')}</button>
          <button onClick={pick(onChangeIp)}>{t('menu.changeIp')}</button>
          <button onClick={pick(onRestart)}>{t('menu.restart')}</button>
          <div className="menu-sep" />
          {confirm ? (
            <button className="danger confirm" onClick={pick(onDelete)}>
              {t('menu.confirmDelete')}
            </button>
          ) : (
            <button className="danger" onClick={() => setConfirm(true)}>
              {t('menu.delete')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
