// const { app, BrowserWindow } = require('electron');

import { app, BrowserWindow} from "electron"
// const path = require('path');

import path from "path"
const isDev = process.argv.includes('--dev') || !app.isPackaged;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // In development, load from Vite dev server
  // In production, load from built files
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173'); // Vite's default dev server
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});