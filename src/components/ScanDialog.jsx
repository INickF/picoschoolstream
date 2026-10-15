import { useEffect, useState } from 'react';
import { useT } from '../i18n.jsx';
import { RefreshIcon } from './icons.jsx';

// Scans the local network for headsets and adds the selected ones.
export default function ScanDialog({ headsets, onAdd, onClose }) {
  const t = useT();
  const [progress, setProgress] = useState({ done: 0, total: 0, found: [] });
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [run, setRun] = useState(0);

  const known = new Set(headsets.map((h) => h.ip));
  const scanning = result === null;
  const found = result?.found ?? progress.found;

  useEffect(() => {
    let alive = true;
    setResult(null);
    setProgress({ done: 0, total: 0, found: [] });
    window.pico
      .scanLan((p) => alive && setProgress(p))
      .then((r) => {
        if (!alive) return;
        setResult(r);
        // Preselect every new headset.
        setSelected(new Set(r.found.filter((d) => !known.has(d.ip)).map((d) => d.ip)));
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const toggle = (ip) =>
    setSelected((s) => {
      const next = new Set(s);
      next.has(ip) ? next.delete(ip) : next.add(ip);
      return next;
    });

  const add = () => {
    onAdd(found.filter((d) => selected.has(d.ip) && !known.has(d.ip)));
    onClose();
  };

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const newCount = found.filter((d) => selected.has(d.ip) && !known.has(d.ip)).length;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal apps-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="apps-head">
          <h2>{t('scan.title')}</h2>
          <div className="apps-sub">
            {scanning
              ? t('scan.progress', { pct })
              : t('scan.done', { n: found.length, nets: result.subnets.join(', ') || '—' })}
          </div>
        </div>
        {scanning && (
          <div className="scan-bar">
            <div style={{ width: `${pct}%` }} />
          </div>
        )}

        <div className="apps-list">
          {found.length === 0 ? (
            <div className="apps-empty">{scanning ? <div className="spinner" /> : t('scan.none')}</div>
          ) : (
            found.map((d) => {
              const added = known.has(d.ip);
              return (
                <label key={d.ip} className={`app-row scan-row ${added ? 'added' : ''}`}>
                  <input
                    type="checkbox"
                    checked={added || selected.has(d.ip)}
                    disabled={added}
                    onChange={() => toggle(d.ip)}
                  />
                  <span className="app-text">
                    <span className="app-label">{d.ip}</span>
                    <span className="app-pkg">{[d.deviceName, d.model].filter(Boolean).join(' · ') || 'PICO'}</span>
                  </span>
                  {added && <span className="app-tag">{t('scan.added')}</span>}
                  {!d.agent && <span className="app-tag">{t('scan.noAgent')}</span>}
                </label>
              );
            })
          )}
        </div>

        <div className="modal-actions spread">
          <button className="ghost-btn" disabled={scanning} onClick={() => setRun((r) => r + 1)}>
            <RefreshIcon width={13} height={13} /> {t('scan.again')}
          </button>
          <div className="modal-actions">
            <button className="ghost-btn" onClick={onClose}>
              {t('dialog.cancel')}
            </button>
            <button className="primary-btn" disabled={newCount === 0} onClick={add}>
              {t('scan.add', { n: newCount })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
