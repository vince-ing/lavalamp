const { app, BrowserWindow, globalShortcut, screen, ipcMain } = require('electron');

let win;
let interactive = false;

app.whenReady().then(() => {
  const { width, height } = screen.getPrimaryDisplay().bounds;

  win = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: __dirname + '/preload.cjs',
    },
  });

  win.loadURL('http://localhost:5173');

  // Start in click-through mode
  win.setIgnoreMouseEvents(true, { forward: true });

  ipcMain.on('set-ignore-mouse', (_, ignore) => {
    win.setIgnoreMouseEvents(ignore, { forward: true });
  });

  // Alt+I — toggle interactive mode
  globalShortcut.register('Alt+I', () => {
    interactive = !interactive;
    win.setIgnoreMouseEvents(!interactive, { forward: true });
  });

  // Alt+L — hide/show
  let visible = true;
  globalShortcut.register('Alt+L', () => {
    visible = !visible;
    visible ? win.showInactive() : win.hide();
  });

  globalShortcut.register('Alt+Q', () => app.quit());
});

app.on('will-quit', () => globalShortcut.unregisterAll());