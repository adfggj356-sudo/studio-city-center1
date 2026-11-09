
const { app, BrowserWindow, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const { pathToFileURL } = require('node:url');

const PORT = 3210;
let mainWindow;

function waitForServer(url, attempts = 60) {
  return new Promise((resolve, reject) => {
    let count = 0;
    const check = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });
      request.on('error', () => {
        count += 1;
        if (count >= attempts) return reject(new Error('Local application server did not start.'));
        setTimeout(check, 500);
      });
      request.setTimeout(1000, () => request.destroy());
    };
    check();
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
    process.env.NODE_ENV = 'production';
    process.env.PORT = String(PORT);
    process.env.STUDIO_DATA_DIR = app.getPath('userData');
    process.env.STUDIO_ENV_PATH = path.join(process.env.STUDIO_DATA_DIR, '.env');

    fs.mkdirSync(process.env.STUDIO_DATA_DIR, { recursive: true });

    if (!fs.existsSync(process.env.STUDIO_ENV_PATH)) {
      fs.writeFileSync(
        process.env.STUDIO_ENV_PATH,
        '# Add your Gemini API key after the equals sign\nGEMINI_API_KEY=\n',
        'utf8'
      );
    }

    require('dotenv').config({ path: process.env.STUDIO_ENV_PATH });

    await import(
      pathToFileURL(path.join(app.getAppPath(), 'dist', 'server.mjs')).href
    );

    await waitForServer(`http://127.0.0.1:${PORT}/api/health`);
    createWindow();

  } catch (error) {
    console.error(error);
    dialog.showErrorBox(
      'تعذر تشغيل ستوديو ستي سنتر',
      'لم يتمكن البرنامج من تشغيل الخادم المحلي. أعد تثبيت البرنامج أو تواصل مع الدعم الفني.'
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
