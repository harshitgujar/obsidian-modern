const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

function setupAppMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: 'Obsidian',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'CmdOrCtrl+,',
          click: (_menuItem, browserWindow) => {
            if (browserWindow) browserWindow.webContents.send('app:open-settings');
          }
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Note',
          accelerator: 'CmdOrCtrl+N',
          click: (_menuItem, browserWindow) => {
            if (browserWindow) browserWindow.webContents.send('file:new-note');
          }
        },
        {
          label: 'Quick Switcher...',
          accelerator: 'CmdOrCtrl+O',
          click: (_menuItem, browserWindow) => {
            if (browserWindow) browserWindow.webContents.send('switcher:open');
          }
        },
        { type: 'separator' },
        {
          label: 'Export to PDF...',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: (_menuItem, browserWindow) => {
            if (browserWindow) browserWindow.webContents.send('file:export-pdf');
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Obsidian Documentation',
          click: async () => {
            await shell.openExternal('https://help.obsidian.md');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 800,
    minHeight: 500,
    backgroundColor: '#121214',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 14 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const url = process.env.VITE_DEV_SERVER_URL || `file://${path.join(__dirname, '../dist/index.html')}`;
  win.loadURL(url);
}

// Register real Obsidian IPC channels discovered via REA reverse engineering of main.js
function registerObsidianIpc() {
  ipcMain.on('version', (event) => {
    event.returnValue = '1.13.7';
  });

  ipcMain.on('get-documents-path', (event) => {
    event.returnValue = app.getPath('documents');
  });

  ipcMain.on('get-sandbox-vault-path', (event) => {
    event.returnValue = path.join(app.getPath('userData'), 'Obsidian Sandbox');
  });

  ipcMain.on('get-default-vault-path', (event) => {
    event.returnValue = path.join(process.cwd(), 'vault');
  });

  ipcMain.handle('trash', async (_event, filePath) => {
    try {
      await shell.trashItem(filePath);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.on('open-url', (_event, url) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      shell.openExternal(url);
    }
  });

  ipcMain.handle('pick-vault-folder', async () => {
    const res = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    });
    if (res.canceled || res.filePaths.length === 0) return null;
    return res.filePaths[0];
  });
}

app.whenReady().then(() => {
  setupAppMenu();
  registerObsidianIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
