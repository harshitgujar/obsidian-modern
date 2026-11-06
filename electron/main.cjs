const { app, BrowserWindow, ipcMain, shell, dialog, Menu, Tray, nativeImage, globalShortcut, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;
let trayWindow = null;
let isTrayPinned = false;

function setupAppMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: 'Runagon',
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
          label: 'Runagon Documentation',
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

const http = require('http');
let embeddedServer = null;

function startEmbeddedServer(distDir, vaultServer) {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.webm': 'audio/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.pdf': 'application/pdf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
  };

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // 1. API calls routed to ObsidianVaultServer
      if (req.url && req.url.startsWith('/api/vault')) {
        return vaultServer.handleRequest(req, res, () => {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Endpoint not found' }));
        });
      }

      // 2. Static Assets from dist/
      try {
        const parsedUrl = new URL(req.url, 'http://127.0.0.1');
        let pathname = decodeURIComponent(parsedUrl.pathname);
        if (pathname === '/') pathname = '/index.html';

        const filePath = path.join(distDir, pathname);

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          const contentType = mimeTypes[ext] || 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': contentType });
          fs.createReadStream(filePath).pipe(res);
          return;
        }

        // SPA fallback to index.html
        const indexPath = path.join(distDir, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          fs.createReadStream(indexPath).pipe(res);
          return;
        }

        res.writeHead(404);
        res.end('Not found');
      } catch (err) {
        res.writeHead(500);
        res.end(String(err));
      }
    });

    server.listen(0, '127.0.0.1', () => {
      embeddedServer = server;
      const port = server.address().port;
      resolve(`http://127.0.0.1:${port}`);
    });
    server.on('error', reject);
  });
}

function createWindow(targetUrl) {
  const iconPath = path.join(__dirname, '../build/icon.png');

  if (process.platform === 'darwin' && app.dock && fs.existsSync(iconPath)) {
    try {
      app.dock.setIcon(iconPath);
    } catch {}
  }

  const win = new BrowserWindow({
    title: 'Runagon',
    width: 1360,
    height: 860,
    minWidth: 800,
    minHeight: 500,
    backgroundColor: '#121214',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 14, y: 14 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow = win;

  win.on('closed', () => {
    mainWindow = null;
  });

  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const levelNames = ['VERBOSE', 'INFO', 'WARNING', 'ERROR'];
    console.log(`[Renderer] [${levelNames[level] || level}] ${message} (${sourceId}:${line})`);
  });

  const url = targetUrl || process.env.VITE_DEV_SERVER_URL || `file://${path.join(__dirname, '../dist/index.html')}`;
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
    event.returnValue = path.join(app.getPath('userData'), 'Runagon Sandbox');
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

  // Quick Capture & Retrieval Tray IPC channels
  ipcMain.on('tray:hide', () => {
    if (trayWindow && trayWindow.isVisible()) {
      trayWindow.hide();
    }
  });

  ipcMain.on('tray:set-pinned', (_event, pinned) => {
    isTrayPinned = Boolean(pinned);
    if (trayWindow) {
      trayWindow.setAlwaysOnTop(isTrayPinned);
    }
  });

  ipcMain.on('tray:open-in-main', (_event, { filePath, vaultPath }) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      if (filePath) {
        mainWindow.webContents.send('app:select-file', filePath);
      }
    }
  });

  ipcMain.on('tray:reveal-file', (_event, targetPath) => {
    if (targetPath && fs.existsSync(targetPath)) {
      shell.showItemInFolder(targetPath);
    }
  });

  ipcMain.handle('tray:save-dropped-file', async (_event, { sourcePath, targetVaultPath, targetFolder, fileName }) => {
    try {
      const destDir = path.join(targetVaultPath, targetFolder || '');
      fs.mkdirSync(destDir, { recursive: true });
      const destPath = path.join(destDir, fileName);
      fs.copyFileSync(sourcePath, destPath);
      const relPath = path.join(targetFolder || '', fileName).replace(/^[\/\\]+/, '');
      return { ok: true, relPath, absPath: destPath };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });
}

function getTrayIcon() {
  const iconPath = path.join(__dirname, '../build/icon.png');
  if (fs.existsSync(iconPath)) {
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 });
    if (process.platform === 'darwin') {
      icon.setTemplateImage(true);
    }
    return icon;
  }
  return nativeImage.createEmpty();
}

function createTrayWindow(targetUrl) {
  const base = targetUrl || process.env.VITE_DEV_SERVER_URL || `file://${path.join(__dirname, '../dist/index.html')}`;
  const separator = base.includes('?') ? '&' : '?';
  const trayUrl = `${base}${separator}view=tray`;

  trayWindow = new BrowserWindow({
    width: 440,
    height: 580,
    show: false,
    frame: false,
    resizable: false,
    movable: true,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#18181b',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  trayWindow.loadURL(trayUrl);

  trayWindow.on('blur', () => {
    if (!isTrayPinned && trayWindow && trayWindow.isVisible()) {
      trayWindow.hide();
    }
  });

  trayWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      trayWindow.hide();
    }
  });
}

function toggleTrayWindow(bounds) {
  if (!trayWindow) return;
  if (trayWindow.isVisible()) {
    trayWindow.hide();
    return;
  }

  const windowBounds = trayWindow.getBounds();
  const currentBounds = bounds || (tray ? tray.getBounds() : null);

  if (currentBounds && currentBounds.x > 0) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    let x = Math.round(currentBounds.x + (currentBounds.width / 2) - (windowBounds.width / 2));
    let y = Math.round(currentBounds.y + currentBounds.height + 6);

    if (x < 12) x = 12;
    if (x + windowBounds.width > screenWidth - 12) x = screenWidth - windowBounds.width - 12;
    if (y + windowBounds.height > screenHeight - 12) y = Math.max(12, currentBounds.y - windowBounds.height - 6);

    trayWindow.setPosition(x, y, false);
  } else {
    const cursor = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursor);
    const { width, height, x: dispX, y: dispY } = display.workArea;
    const x = Math.round(dispX + (width / 2) - (windowBounds.width / 2));
    const y = Math.round(dispY + Math.min(80, height * 0.1));
    trayWindow.setPosition(x, y, false);
  }

  trayWindow.show();
  trayWindow.focus();
}

function setupTray(targetUrl) {
  try {
    createTrayWindow(targetUrl);
    tray = new Tray(getTrayIcon());
    tray.setToolTip('Runagon Quick Capture & Retrieval (⌥Space)');

    tray.on('click', (_event, bounds) => {
      toggleTrayWindow(bounds);
    });

    tray.on('right-click', () => {
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Quick Capture & Retrieval',
          accelerator: 'Option+Space',
          click: () => toggleTrayWindow()
        },
        {
          label: 'Open Runagon',
          click: () => {
            if (mainWindow) {
              if (mainWindow.isMinimized()) mainWindow.restore();
              mainWindow.show();
              mainWindow.focus();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Quit Runagon',
          click: () => {
            app.isQuitting = true;
            app.quit();
          }
        }
      ]);
      tray.popUpContextMenu(contextMenu);
    });

    try {
      globalShortcut.register('Option+Space', () => {
        toggleTrayWindow();
      });
    } catch (e) {
      console.warn('Could not register Option+Space:', e);
    }

    try {
      globalShortcut.register('CommandOrControl+Shift+R', () => {
        toggleTrayWindow();
      });
    } catch {}
  } catch (err) {
    console.warn('Tray initialization failed:', err);
  }
}

function startDevControlServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = new URL(req.url, 'http://127.0.0.1:5178');
      const wins = BrowserWindow.getAllWindows();
      const winParam = parsedUrl.searchParams.get('win');
      let win = wins[0];
      if (winParam === 'tray') {
        win = trayWindow || wins[1] || wins[0];
      } else if (winParam !== null && !isNaN(Number(winParam))) {
        win = wins[Number(winParam)] || wins[0];
      }

      if (parsedUrl.pathname === '/toggle-tray') {
        toggleTrayWindow();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, visible: trayWindow ? trayWindow.isVisible() : false }));
      }

      if (parsedUrl.pathname === '/screenshot') {
        const outPath = parsedUrl.searchParams.get('path');
        if (!win) {
          res.writeHead(500);
          return res.end('No window');
        }
        if (!win.isVisible()) {
          win.show();
        }
        const img = await win.webContents.capturePage();
        const buf = img.toPNG();
        if (outPath) {
          fs.writeFileSync(outPath, buf);
        }
        res.writeHead(200, { 'Content-Type': 'image/png' });
        return res.end(buf);
      }

      if (parsedUrl.pathname === '/eval') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          if (!win) {
            res.writeHead(500);
            return res.end('No window');
          }
          try {
            const result = await win.webContents.executeJavaScript(body);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ result }));
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: String(e) }));
          }
        });
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    } catch (e) {
      res.writeHead(500);
      res.end(String(e));
    }
  });

  server.listen(5178, '127.0.0.1', () => {
    console.log('[DevControl] listening on http://127.0.0.1:5178');
  });
}

app.whenReady().then(async () => {
  app.setName('Runagon');
  setupAppMenu();
  registerObsidianIpc();
  startDevControlServer();

  let targetUrl = process.env.VITE_DEV_SERVER_URL;
  if (!targetUrl) {
    try {
      const distDir = path.join(__dirname, '../dist');
      
      let sandboxDir = path.join(__dirname, '../resources/sandbox');
      if (app.isPackaged) {
        const packagedSandbox = path.join(process.resourcesPath, 'resources/sandbox');
        const altPackagedSandbox = path.join(process.resourcesPath, 'sandbox');
        if (fs.existsSync(packagedSandbox)) {
          sandboxDir = packagedSandbox;
        } else if (fs.existsSync(altPackagedSandbox)) {
          sandboxDir = altPackagedSandbox;
        }
      }

      const userDataDir = app.getPath('userData');
      const defaultVaultDir = path.join(app.getPath('documents'), 'RunagonVault');

      const serverPath = path.join(__dirname, '../dist-electron/server.cjs');
      const { ObsidianVaultServer } = require(serverPath);
      const vaultServer = new ObsidianVaultServer({
        rootDir: userDataDir,
        defaultVaultDir: defaultVaultDir,
        sandboxTemplateDir: sandboxDir
      });

      targetUrl = await startEmbeddedServer(distDir, vaultServer);
    } catch (e) {
      console.error('Failed to start embedded production server, falling back to file URL:', e);
    }
  }

  createWindow(targetUrl);
  setupTray(targetUrl);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(targetUrl);
  });
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('will-quit', () => {
  try {
    globalShortcut.unregisterAll();
  } catch {}
});

app.on('window-all-closed', () => {
  if (embeddedServer) {
    embeddedServer.close();
  }
  if (process.platform !== 'darwin') app.quit();
});
