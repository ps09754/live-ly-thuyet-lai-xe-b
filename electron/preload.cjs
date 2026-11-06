const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcherApi', {
  startServer: (options) => ipcRenderer.invoke('server:start', options),
  pauseServer: () => ipcRenderer.invoke('server:pause', {}),
  openUrl: (url) => ipcRenderer.invoke('app:openUrl', url),
  copyText: (text) => ipcRenderer.invoke('app:copyText', text),
  onServerStatus: (callback) => {
    ipcRenderer.on('server:status', (_event, status) => callback(status));
  },
  onServerLog: (callback) => {
    ipcRenderer.on('server:log', (_event, msg) => callback(msg));
  },
});

