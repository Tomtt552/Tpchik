const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fusionBridge', {
  publishNowPlaying: state => ipcRenderer.send('fusion:now-playing', state),
  minimizeToIsland: () => ipcRenderer.send('fusion:minimize-to-island'),
  setIslandAnchor: anchor => ipcRenderer.invoke('fusion:island-anchor', anchor),
  importAudio: () => ipcRenderer.invoke('fusion:import-audio'),
  chooseWallpaper: () => ipcRenderer.invoke('fusion:choose-wallpaper'),
  importPaths: paths => ipcRenderer.invoke('fusion:import-paths', paths),
  selectWallpaper: () => ipcRenderer.invoke('fusion:select-wallpaper'),
  chooseSingBox: () => ipcRenderer.invoke('fusion:choose-singbox'),
  startVless: (uri, options) => ipcRenderer.invoke('fusion:start-vless', uri, options),
  stopVless: () => ipcRenderer.invoke('fusion:stop-vless'),
  getSystemAudioSource: () => ipcRenderer.invoke('fusion:get-system-audio-source'),
  getPcTelemetry: () => ipcRenderer.invoke('fusion:pc-telemetry'),
  onIslandAction: callback => {
    if (typeof callback !== 'function') return;
    ipcRenderer.on('fusion:island-action', (_event, action) => callback(action));
  }
});
