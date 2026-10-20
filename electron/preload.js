const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pico', {
  loadStore: () => ipcRenderer.invoke('store:load'),
  saveStore: (data) => ipcRenderer.invoke('store:save', data),
  status: (ip, timeInterval) => ipcRenderer.invoke('pico:status', ip, timeInterval),
  initiative: (ip, deviceName) => ipcRenderer.invoke('pico:initiative', ip, deviceName),
  succeeded: (ip, deviceName) => ipcRenderer.invoke('pico:succeeded', ip, deviceName),
  failed: (ip, deviceName) => ipcRenderer.invoke('pico:failed', ip, deviceName),
  termination: (ip, deviceName) => ipcRenderer.invoke('pico:termination', ip, deviceName),
  agentStatus: (ip) => ipcRenderer.invoke('agent:status', ip),
  agentApps: (ip) => ipcRenderer.invoke('agent:apps', ip),
  agentLaunch: (ip, pkg) => ipcRenderer.invoke('agent:launch', ip, pkg),
  agentClose: (ip, pkg, all) => ipcRenderer.invoke('agent:close', ip, pkg, all),
  agentPickApk: () => ipcRenderer.invoke('agent:pickApk'),
  agentInstall: (ip, filePath, anyNetwork) => ipcRenderer.invoke('agent:install', ip, filePath, anyNetwork),
  agentUninstall: (ip, pkg) => ipcRenderer.invoke('agent:uninstall', ip, pkg),
  scanLan: (onProgress) => {
    const listener = (_e, progress) => onProgress(progress);
    ipcRenderer.on('scan:progress', listener);
    return ipcRenderer.invoke('scan:lan').finally(() => ipcRenderer.removeListener('scan:progress', listener));
  },
  setActive: (casts) => ipcRenderer.send('pico:active', casts),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
});
