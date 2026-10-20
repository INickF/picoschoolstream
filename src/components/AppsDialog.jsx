import { useEffect, useState } from 'react';
import { useT } from '../i18n.jsx';
import { closeAllApps, installApk, launchApp, loadApps, uninstallApp, useAgents } from '../agent/agentManager.js';
import { errorText, jobText, jobTone } from '../agent/agentText.js';
import { InstallIcon, StopIcon, TrashIcon } from './icons.jsx';

const CONFIRM_RESET_MS = 4000;

// Launch / close / install / delete apps on one headset or on many (targets = list of headsets).
export default function AppsDialog({ targets, anyNetwork, onAnyNetwork, onClose }) {
  const t = useT();
  const agents = useAgents();
  const [apps, setApps] = useState(null);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  // Package whose delete button was pressed once and now asks "Delete?".
  const [confirmDel, setConfirmDel] = useState(null);

  const single = targets.length === 1;
  const online = targets.filter((h) => agents[h.id]?.online);
  const onlineKey = online.map((h) => h.ip).join(',');
  // Changes when an install / delete finishes on a target, so the list is reloaded without a spinner.
  const doneKey = online
    .map((h) => agents[h.id]?.job)
    .map((j) => (j?.state === 'done' ? `${j.kind}:${j.package}` : ''))
    .join(',');

  useEffect(() => setApps(null), [onlineKey]);

  useEffect(() => {
    let alive = true;
    loadApps(online).then((list) => alive && setApps(list));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineKey, doneKey]);

  useEffect(() => {
    if (!confirmDel) return;
    const timer = setTimeout(() => setConfirmDel(null), CONFIRM_RESET_MS);
    return () => clearTimeout(timer);
  }, [confirmDel]);

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

  const run = async (action, label, countKey = 'apps.okCount') => {
    setBusy(true);
    setResult(null);
    const out = await action();
    setBusy(false);
    const failed = out.filter((x) => !x.res.ok);
    setResult({
      label,
      countKey,
      ok: out.length - failed.length,
      total: out.length,
      failed: failed.map((x) => `${x.headset.name}: ${errorText(t, x.res.error)}`),
    });
  };

  const launch = (app) => run(() => launchApp(online, app.package), t('apps.launched', { app: app.label }));
  const close = () => run(() => closeAllApps(online), t('apps.closed'));

  const install = async () => {
    const file = await window.pico.agentPickApk();
    if (!file) return;
    const name = file.split(/[\\/]/).pop();
    run(() => installApk(online, file, anyNetwork), t('apps.installSent', { file: name }), 'apps.startedCount');
  };

  const remove = (app) => {
    if (confirmDel !== app.package) {
      setConfirmDel(app.package);
      return;
    }
    setConfirmDel(null);
    const having = online.filter((h) => app.ids.includes(h.id));
    run(() => uninstallApp(having, app.package), t('apps.deleteSent', { app: app.label }), 'apps.startedCount');
  };

  // Install / delete progress on each target that has a job.
  const jobs = online.map((h) => ({ headset: h, job: agents[h.id]?.job })).filter((x) => x.job);

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
              <div key={app.package} className="app-item">
                <button className="app-row" disabled={busy} onClick={() => launch(app)} title={t('apps.launch')}>
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
                <button
                  className={`app-del ${confirmDel === app.package ? 'confirm' : ''}`}
                  disabled={busy}
                  title={t('apps.delete')}
                  onClick={() => remove(app)}
                >
                  <TrashIcon width={14} height={14} />
                  {confirmDel === app.package && <span>{t('apps.deleteConfirm')}</span>}
                </button>
              </div>
            ))
          )}
        </div>

        {jobs.length > 0 && (
          <div className="apps-jobs">
            {jobs.map(({ headset, job }) => (
              <div key={headset.id} className={`job-row ${jobTone(job)}`}>
                {!single && <span className="job-name">{headset.name}</span>}
                <span className="job-text">{jobText(t, job)}</span>
                {job.state === 'downloading' && (
                  <span className="job-bar"><span style={{ width: `${job.progress}%` }} /></span>
                )}
              </div>
            ))}
          </div>
        )}

        {result && (
          <div className={`apps-result ${result.failed.length ? 'bad' : ''}`}>
            <div>
              {result.label} — {t(result.countKey, { n: result.ok, total: result.total })}
            </div>
            {result.failed.map((f) => (
              <div key={f} className="apps-fail">{f}</div>
            ))}
          </div>
        )}

        <label className="apps-option" title={t('apps.anyNetworkHint')}>
          <input type="checkbox" checked={anyNetwork} onChange={(e) => onAnyNetwork(e.target.checked)} />
          {t('apps.anyNetwork')}
        </label>

        <div className="modal-actions spread">
          <div className="modal-actions">
            <button className="ghost-btn danger" disabled={busy || online.length === 0} onClick={close}>
              <StopIcon width={11} height={11} /> {t('apps.closeAll')}
            </button>
            <button className="ghost-btn" disabled={busy || online.length === 0} onClick={install}>
              <InstallIcon width={14} height={14} /> {t('apps.install')}
            </button>
          </div>
          <button className="ghost-btn" onClick={onClose}>
            {t('apps.done')}
          </button>
        </div>
      </div>
    </div>
  );
}
