const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('islandBridge', {
  onState: callback => {
    if (typeof callback !== 'function') return;
    ipcRenderer.on('fusion:island-state', (_event, state) => callback(state));
  },
  action: action => ipcRenderer.send('fusion:island-action', action),
  resize: expanded => ipcRenderer.send('fusion:island-resize', Boolean(expanded)),
  onClickThroughState: callback => { if (typeof callback === 'function') ipcRenderer.on('fusion:island-clickthrough-state', (_event, value) => callback(Boolean(value))); }
});
