const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const store = require('./store');
const pico = require('./picoApi');
const agent = require('./agentApi');
const scanner = require('./scanner');
const apkServer = require('./apkServer');

const isDev = process.env.NODE_ENV === 'development';

// ip -> deviceName for every headset currently casting, so we can terminate on quit.
let activeCasts = {};
let quitting = false;

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 860,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0e0f11',
    autoHideMenuBar: true,
    title: 'PicoSchoolStream',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  win.setMenuBarVisibility(false);

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

ipcMain.handle('store:load', () => store.load());
ipcMain.handle('store:save', (_e, data) => store.save(data));

ipcMain.handle('pico:status', (_e, ip, timeInterval) => pico.status(ip, timeInterval));
ipcMain.handle('pico:initiative', (_e, ip, deviceName) => pico.initiative(ip, deviceName));
ipcMain.handle('pico:succeeded', (_e, ip, deviceName) => pico.succeeded(ip, deviceName));
ipcMain.handle('pico:failed', (_e, ip, deviceName) => pico.failed(ip, deviceName));
ipcMain.handle('pico:termination', (_e, ip, deviceName) => pico.termination(ip, deviceName));
ipcMain.handle('agent:status', (_e, ip) => agent.status(ip));
ipcMain.handle('agent:apps', (_e, ip) => agent.apps(ip));
ipcMain.handle('agent:launch', (_e, ip, pkg) => agent.launch(ip, pkg));
ipcMain.handle('agent:close', (_e, ip, pkg, all) => agent.close(ip, pkg, all));
ipcMain.handle('agent:pickApk', async (e) => {
  const res = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), {
    properties: ['openFile'],
    filters: [{ name: 'Android app', extensions: ['apk'] }],
  });
  return res.canceled ? null : res.filePaths[0];
});
ipcMain.handle('agent:install', async (_e, ip, filePath, anyNetwork) => {
  const url = await apkServer.urlFor(filePath, ip, { anyNetwork });
  if (!url) return { ok: false, error: 'no_shared_network' };
  return agent.install(ip, url);
});
ipcMain.handle('agent:uninstall', (_e, ip, pkg) => agent.uninstall(ip, pkg));
ipcMain.handle('scan:lan', (e) =>
  scanner.scan((progress) => {
    if (!e.sender.isDestroyed()) e.sender.send('scan:progress', progress);
  }),
);
ipcMain.on('pico:active', (_e, casts) => {
  activeCasts = casts || {};
});

ipcMain.handle('window:toggleFullscreen', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win) return false;
  win.setFullScreen(!win.isFullScreen());
  return win.isFullScreen();
});

// Streams start without a user gesture (Enable all, auto-reconnect).
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Release every headset before exiting, otherwise it stays "somebody playing".
app.on('before-quit', (e) => {
  const entries = Object.entries(activeCasts);
  if (quitting || entries.length === 0) return;
  e.preventDefault();
  quitting = true;
  const all = Promise.all(entries.map(([ip, dn]) => pico.termination(ip, dn, 1000)));
  const cap = new Promise((r) => setTimeout(r, 1500));
  Promise.race([all, cap]).finally(() => app.quit());
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
