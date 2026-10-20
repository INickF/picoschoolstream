import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useHeadsets } from './hooks/useHeadsets.js';
import { disableAll, enableAll, getSession, syncSessions } from './stream/sessionManager.js';
import TopBar from './components/TopBar.jsx';
import HeadsetTile from './components/HeadsetTile.jsx';
import FocusView from './components/FocusView.jsx';
import HeadsetDialog from './components/HeadsetDialog.jsx';
import AppsDialog from './components/AppsDialog.jsx';
import ScanDialog from './components/ScanDialog.jsx';
import { syncAgents } from './agent/agentManager.js';
import { HeadsetIcon, PlusIcon, SearchIcon } from './components/icons.jsx';
import { I18nProvider, detectLanguage, translate } from './i18n.jsx';

// Re-renders when any session changes so the "N live" counter stays current.
function useLiveCount(headsets) {
  const subscribe = useCallback(
    (fn) => {
      const offs = (headsets ?? []).map((h) => getSession(h.id)?.subscribe(fn));
      return () => offs.forEach((off) => off?.());
    },
    [headsets],
  );
  return useSyncExternalStore(
    subscribe,
    () => (headsets ?? []).filter((h) => getSession(h.id)?.state.status === 'playing').length,
  );
}

export default function App() {
  const { headsets, settings, add, update, remove, updateSettings } = useHeadsets();
  const [focusedId, setFocusedId] = useState(null);
  const [dialog, setDialog] = useState(null);

  // Sessions must exist before tiles render, so reconcile during render (idempotent).
  useMemo(() => headsets && syncSessions(headsets), [headsets]);

  useEffect(() => {
    if (headsets) syncAgents(headsets);
  }, [headsets]);

  const live = useLiveCount(headsets);
  const lang = settings.language ?? detectLanguage();
  const t = (key, vars) => translate(lang, key, vars);
  const focused = headsets?.find((h) => h.id === focusedId);
  const closeFocus = useCallback(() => setFocusedId(null), []);
  const closeDialog = useCallback(() => setDialog(null), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'F11') {
        e.preventDefault();
        window.pico.toggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  if (!headsets) return <div className="loading" />;

  const submitDialog = ({ name, ip }) => {
    if (dialog.mode === 'add') add(name, ip);
    if (dialog.mode === 'rename') update(dialog.headset.id, { name });
    if (dialog.mode === 'ip') update(dialog.headset.id, { ip });
    setDialog(null);
  };

  const addFound = (devices) =>
    devices.forEach((d, i) =>
      add(t('dialog.defaultName', { n: String(headsets.length + i + 1).padStart(2, '0') }), d.ip),
    );

  const deleteHeadset = (id) => {
    if (focusedId === id) setFocusedId(null);
    remove(id);
  };

  return (
    <I18nProvider value={lang}>
      <div className="app">
        <TopBar
          live={live}
          total={headsets.length}
          tileSize={settings.tileSize ?? 'md'}
          onTileSize={(tileSize) => updateSettings({ tileSize })}
          lang={lang}
          onLang={(language) => updateSettings({ language })}
          onAdd={() => setDialog({ mode: 'add' })}
          onScan={() => setDialog({ mode: 'scan' })}
          onApps={() => setDialog({ mode: 'apps', targets: headsets })}
          onEnableAll={enableAll}
          onDisableAll={disableAll}
        />

        {headsets.length === 0 ? (
          <div className="empty">
            <HeadsetIcon width={56} height={56} strokeWidth={1.2} />
            <h2>{t('empty.title')}</h2>
            <p>{t('empty.text')}</p>
            <div className="empty-actions">
              <button className="primary-btn" onClick={() => setDialog({ mode: 'scan' })}>
                <SearchIcon width={14} height={14} /> {t('app.scan')}
              </button>
              <button className="ghost-btn" onClick={() => setDialog({ mode: 'add' })}>
                <PlusIcon width={14} height={14} /> {t('app.add')}
              </button>
            </div>
          </div>
        ) : (
          <main className={`grid size-${settings.tileSize ?? 'md'}`}>
            {headsets.map((h) => (
              <HeadsetTile
                key={h.id}
                headset={h}
                focused={h.id === focusedId}
                onFocus={setFocusedId}
                onUpdate={update}
                onDialog={setDialog}
                onDelete={deleteHeadset}
              />
            ))}
          </main>
        )}

        {focused && (
          <FocusView headset={focused} dialogOpen={!!dialog} onClose={closeFocus} onUpdate={update} onDialog={setDialog} />
        )}

        {dialog?.mode === 'apps' && (
          <AppsDialog
            targets={dialog.targets}
            anyNetwork={!!settings.installAnyNetwork}
            onAnyNetwork={(installAnyNetwork) => updateSettings({ installAnyNetwork })}
            onClose={closeDialog}
          />
        )}

        {dialog?.mode === 'scan' && <ScanDialog headsets={headsets} onAdd={addFound} onClose={closeDialog} />}

        {dialog && dialog.mode !== 'apps' && dialog.mode !== 'scan' && (
          <HeadsetDialog
            mode={dialog.mode}
            headset={dialog.headset}
            headsets={headsets}
            onSubmit={submitDialog}
            onClose={closeDialog}
          />
        )}
      </div>
    </I18nProvider>
  );
}
