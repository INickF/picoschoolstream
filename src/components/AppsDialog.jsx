import { useEffect, useState } from 'react';
import { useT } from '../i18n.jsx';
import { closeAllApps, launchApp, loadApps, useAgents } from '../agent/agentManager.js';
import { StopIcon } from './icons.jsx';

// Launch / close apps on one headset or on many (targets = list of headsets).
export default function AppsDialog({ targets, onClose }) {
  const t = useT();
  const agents = useAgents();
  const [apps, setApps] = useState(null);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const single = targets.length === 1;
  const online = targets.filter((h) => agents[h.id]?.online);
  const onlineKey = online.map((h) => h.ip).join(',');

  useEffect(() => {
    let alive = true;
    setApps(null);
    loadApps(online).then((list) => alive && setApps(list));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineKey]);

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  // package -> number of target headsets that have it in front right now.
  const running = {};
  for (const h of online) {
    const pkg = agents[h.id]?.foreground?.package;
    if (pkg) running[pkg] = (running[pkg] ?? 0) + 1;
  }

  const shown = (apps ?? []).filter(
    (a) => !filter || a.label.toLowerCase().includes(filter.toLowerCase()) || a.package.includes(filter.toLowerCase()),
  );

  const errorText = (code) => {
    const key = `agentErr.${code}`;
    const s = t(key);
    return s === key ? code : s;
  };

  const run = async (action, label) => {
    setBusy(true);
    setResult(null);
    const out = await action();
    setBusy(false);
    const failed = out.filter((x) => !x.res.ok);
    setResult({
      label,
      ok: out.length - failed.length,
      total: out.length,
      failed: failed.map((x) => `${x.headset.name}: ${errorText(x.res.error)}`),
    });
  };

  const launch = (app) => run(() => launchApp(online, app.package), t('apps.launched', { app: app.label }));
  const close = () => run(() => closeAllApps(online), t('apps.closed'));

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal apps-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="apps-head">
          <h2>{single ? t('apps.titleOne', { name: targets[0].name }) : t('apps.titleAll')}</h2>
          <div className="apps-sub">
            {single
              ? online.length
                ? t('apps.agentOnline')
                : t('apps.agentOffline')
              : t('apps.onlineCount', { n: online.length, total: targets.length })}
          </div>
        </div>

        <input
          className="apps-filter"
          placeholder={t('apps.search')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          autoFocus
          spellCheck={false}
        />

        <div className="apps-list">
          {online.length === 0 ? (
            <div className="apps-empty">{t('apps.noAgents')}</div>
          ) : apps === null ? (
            <div className="apps-empty"><div className="spinner" /></div>
          ) : shown.length === 0 ? (
            <div className="apps-empty">{t('apps.none')}</div>
          ) : (
            shown.map((app) => (
              <button key={app.package} className="app-row" disabled={busy} onClick={() => launch(app)} title={t('apps.launch')}>
                <span className="app-text">
                  <span className="app-label">{app.label}</span>
                  <span className="app-pkg">{app.package}</span>
                </span>
                {running[app.package] && (
                  <span className="app-tag live">
                    {single ? t('apps.running') : t('apps.runningOn', { n: running[app.package] })}
                  </span>
                )}
                {!single && app.count < online.length && (
                  <span className="app-tag">{t('apps.installedOn', { n: app.count, total: online.length })}</span>
                )}
              </button>
            ))
          )}
        </div>

        {result && (
          <div className={`apps-result ${result.failed.length ? 'bad' : ''}`}>
            <div>
              {result.label} — {t('apps.okCount', { n: result.ok, total: result.total })}
            </div>
            {result.failed.map((f) => (
              <div key={f} className="apps-fail">{f}</div>
            ))}
          </div>
        )}

        <div className="modal-actions spread">
          <button className="ghost-btn danger" disabled={busy || online.length === 0} onClick={close}>
            <StopIcon width={11} height={11} /> {t('apps.closeAll')}
          </button>
          <button className="ghost-btn" onClick={onClose}>
            {t('apps.done')}
          </button>
        </div>
      </div>
    </div>
  );
}
