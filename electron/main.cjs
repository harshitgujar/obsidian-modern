const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 500,
    backgroundColor: '#121214',
    titleBarStyle: 'hiddenInset', // Mac sleek obsidian style
    trafficLightPosition: { x: 14, y: 14 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const url = process.env.VITE_DEV_SERVER_URL || `file://${path.join(__dirname, '../dist/index.html')}`;
  win.loadURL(url);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
