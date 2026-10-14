const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pico', {
  loadStore: () => ipcRenderer.invoke('store:load'),
  saveStore: (data) => ipcRenderer.invoke('store:save', data),
  status: (ip, timeInterval) => ipcRenderer.invoke('pico:status', ip, timeInterval),
  initiative: (ip, deviceName) => ipcRenderer.invoke('pico:initiative', ip, deviceName),
  succeeded: (ip, deviceName) => ipcRenderer.invoke('pico:succeeded', ip, deviceName),
  failed: (ip, deviceName) => ipcRenderer.invoke('pico:failed', ip, deviceName),
  termination: (ip, deviceName) => ipcRenderer.invoke('pico:termination', ip, deviceName),
  setActive: (casts) => ipcRenderer.send('pico:active', casts),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
});
