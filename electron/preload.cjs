const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  pickVaultFolder: () => ipcRenderer.invoke('pick-vault-folder'),
  openUrl: (url) => ipcRenderer.send('open-url', url),
  onFileNewNote: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('file:new-note', handler);
    return () => ipcRenderer.removeListener('file:new-note', handler);
  },
  onSwitcherOpen: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('switcher:open', handler);
    return () => ipcRenderer.removeListener('switcher:open', handler);
  }
});
