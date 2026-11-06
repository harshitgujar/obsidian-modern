const { contextBridge, ipcRenderer, webUtils } = require('electron');

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
  },
  onSelectFile: (callback) => {
    const handler = (_event, filePath) => callback(filePath);
    ipcRenderer.on('app:select-file', handler);
    return () => ipcRenderer.removeListener('app:select-file', handler);
  },
  // Quick Capture & Retrieval Tray APIs
  hideTrayWindow: () => ipcRenderer.send('tray:hide'),
  setTrayPinned: (pinned) => ipcRenderer.send('tray:set-pinned', pinned),
  openInMainWindow: (filePath, vaultPath) => ipcRenderer.send('tray:open-in-main', { filePath, vaultPath }),
  revealInFinder: (filePath) => ipcRenderer.send('tray:reveal-file', filePath),
  saveDroppedFile: (data) => ipcRenderer.invoke('tray:save-dropped-file', data),
  getPathForFile: (file) => {
    try {
      if (webUtils && typeof webUtils.getPathForFile === 'function') {
        return webUtils.getPathForFile(file);
      }
      return file.path || '';
    } catch {
      return file.path || '';
    }
  }
});
