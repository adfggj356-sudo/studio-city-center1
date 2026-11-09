
const { app, BrowserWindow, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const { spawn } = require('node:child_process');

const PORT = 3210;
let mainWindow;
let serverProcess;

function waitForServer(attempts = 60) {
  return new Promise((resolve, reject) => {
    let count = 0;

    function check() {
      const req = http.get(`http://127.0.0.1:${PORT}/api/health`, res => {
        res.resume();
        if (res.statusCode === 200) resolve();
        else retry();
      });

      req.on('error', retry);
      req.setTimeout(1500, () => req.destroy());

      function retry() {
        count++;
        if (count >= attempts) {
          reject(new Error('Server startup timeout'));
        } else {
          setTimeout(check, 500);
        }
      }
    }

    check();
  });
}

function startServer() {
  const dataDir = app.getPath('userData');
  fs.mkdirSync(dataDir, { recursive: true });

  const envPath = path.join(dataDir, '.env');

  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, 'GEMINI_API_KEY=\n', 'utf8');
  }

  const serverPath = path.join(app.getAppPath(), 'dist', 'server.cjs');

  serverProcess = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: String(PORT),
      STUDIO_APP_DIR: app.getAppPath(),
      STUDIO_ENV_PATH: envPath
    },
    stdio: 'ignore',
    windowsHide: true
  });

  serverProcess.on('error', error => {
    console.error('Server process error:', error);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1050,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f5f5f5',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
}

app.whenReady().then(async () => {
  try {
    startServer();
    await waitForServer();
    createWindow();
  } catch (error) {
    console.error(error);
    dialog.showErrorBox(
      'ستوديو ستي سنتر',
      'تعذر تشغيل خادم البرنامج. يرجى إعادة تثبيت البرنامج.'
    );
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
