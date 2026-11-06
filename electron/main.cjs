const { app, BrowserWindow, ipcMain, shell, clipboard } = require('electron');
const path = require('path');
const http = require('http');
const { spawn, exec } = require('child_process');

let mainWindow = null;
let serverProcess = null;
const PORT = 3000;
const SERVER_URL = `http://127.0.0.1:${PORT}`;
const APP_URL = `http://lvh.me:${PORT}`;

function isServerAlive() {
  return new Promise((resolve) => {
    const req = http.get(`${SERVER_URL}/api/tiktok/status`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(600, () => {
      req.abort();
      resolve(false);
    });
  });
}

async function waitForServer(maxRetries = 25) {
  for (let i = 0; i < maxRetries; i++) {
    const alive = await isServerAlive();
    if (alive) return true;
    await new Promise((r) => setTimeout(r, 350));
  }
  return false;
}

function sendServerLog(text, type = '') {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('server:log', { text, type });
  }
}

function sendServerStatus(status) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('server:status', status);
  }
}

function stopRunningServer() {
  if (serverProcess) {
    try {
      sendServerLog('Đang tắt tiến trình máy chủ...', 'warn');
      if (process.platform === 'win32') {
        exec(`taskkill /pid ${serverProcess.pid} /T /F`, () => {});
      } else {
        serverProcess.kill('SIGTERM');
        setTimeout(() => {
          if (serverProcess) {
            try { serverProcess.kill('SIGKILL'); } catch {}
            serverProcess = null;
          }
        }, 1500);
      }
    } catch (e) {
      console.warn('Error killing server process:', e);
    }
    serverProcess = null;
  }
}

function launchBrowser(url = APP_URL) {
  if (process.platform === 'win32') {
    // Trên Windows: mở trực tiếp bằng Google Chrome, nếu không có Chrome thì mở bằng trình duyệt mặc định
    exec(`start chrome "${url}"`, (err) => {
      if (err) {
        shell.openExternal(url);
      } else {
        sendServerLog(`Đã mở Google Chrome: ${url}`, 'success');
      }
    });
  } else if (process.platform === 'darwin') {
    // Trên macOS: mở bằng Google Chrome, nếu không có thì fallback sang shell.openExternal
    exec(`open -a "Google Chrome" "${url}"`, (err) => {
      if (err) {
        sendServerLog('Không tìm thấy Google Chrome, mở bằng trình duyệt mặc định...', 'info');
        shell.openExternal(url);
      } else {
        sendServerLog(`Đã mở Google Chrome: ${url}`, 'success');
      }
    });
  } else {
    shell.openExternal(url);
  }
}

async function startServerProcess(options = {}) {
  const alreadyAlive = await isServerAlive();
  if (alreadyAlive) {
    sendServerLog('Server đã chạy sẵn từ trước trên cổng 3000.', 'info');
    if (options.autoOpen) launchBrowser(APP_URL);
    return { success: true, alreadyRunning: true };
  }

  stopRunningServer();

  const isDev = !app.isPackaged;
  const appRoot = isDev
    ? path.join(__dirname, '..')
    : path.join(process.resourcesPath, 'app.asar.unpacked');

  let serverScript = path.join(appRoot, 'dist-server', 'server.cjs');
  const fs = require('fs');
  if (!fs.existsSync(serverScript)) {
    serverScript = path.join(__dirname, '..', 'dist-server', 'server.cjs');
  }

  sendServerLog(`Khởi chạy server: ${path.basename(serverScript)}`, 'info');

  const env = {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: 'production',
    PROJECT_ROOT: isDev ? path.join(__dirname, '..') : appRoot,
    ELECTRON_RUN_AS_NODE: '1',
  };

  // Sử dụng binary node nhúng của Electron để chạy server độc lập
  const execBinary = process.execPath;
  serverProcess = spawn(execBinary, [serverScript], {
    env,
    cwd: isDev ? path.join(__dirname, '..') : appRoot,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', (data) => {
    const str = data.toString().trim();
    if (str) sendServerLog(str, 'info');
  });

  serverProcess.stderr.on('data', (data) => {
    const str = data.toString().trim();
    if (str) sendServerLog(str, 'warn');
  });

  serverProcess.on('exit', (code) => {
    sendServerLog(`Tiến trình server kết thúc với mã ${code}`, 'warn');
    serverProcess = null;
    sendServerStatus('stopped');
  });

  const ready = await waitForServer(30);
  if (ready) {
    sendServerLog('Hệ thống đã khởi động thành công và sẵn sàng phục vụ!', 'success');
    if (options.autoOpen) {
      launchBrowser(APP_URL);
    }
    return { success: true };
  } else {
    stopRunningServer();
    return { success: false, error: 'Server không phản hồi sau 10 giây' };
  }
}

function createLauncherWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 600,
    resizable: false,
    maximizable: false,
    title: '600 Câu Lý Thuyết Lái Xe B2/C - LIVE Launcher',
    backgroundColor: '#020617',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'launcher.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Check initial server state after window loads
  mainWindow.webContents.on('did-finish-load', async () => {
    const alive = await isServerAlive();
    if (alive) {
      sendServerStatus('running');
      sendServerLog('Phát hiện Server đang chạy sẵn trên cổng 3000.', 'success');
    }
  });
}

// IPC Handlers
ipcMain.handle('server:start', async (_event, options) => {
  return await startServerProcess(options);
});

ipcMain.handle('server:pause', async () => {
  stopRunningServer();
  return { success: true };
});

ipcMain.handle('app:openUrl', async (_event, url) => {
  launchBrowser(url);
  return { success: true };
});

ipcMain.handle('app:copyText', async (_event, text) => {
  clipboard.writeText(text);
  return { success: true };
});

app.whenReady().then(() => {
  createLauncherWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createLauncherWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopRunningServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopRunningServer();
});
