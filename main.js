const { app, BrowserWindow } = require('electron');
const path = require('path');

const net = require('net');
const mpvSocket = '\\\\.\\pipe\\mpvsocket';

const mpvPath = process.env.MPV_PATH;

const client = net.createConnection(mpvSocket, () => {
  console.log('Connected to MPV');
  client.write(JSON.stringify({
    "command": ["observe_property", 1, "time-pos"]
  }) + '\n');
});

client.on('data', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    if (msg.event === "property-change" && msg.name === "time-pos") {
      const currentTime = msg.data;
      // send to renderer, or use to highlight subtitle
    }
  } catch (e) {
    console.error("Failed to parse MPV response", e);
  }
});



// function createWindow() {
//   const mainWindow = new BrowserWindow({
//     width: 1400,
//     height: 800,
//     webPreferences: {
//       nodeIntegration: true,
//       contextIsolation: false
//     }
//   });

//   mainWindow.loadFile('index.html');
  
//   // Open DevTools in development
//   if (process.argv.includes('--dev')) {
//     mainWindow.webContents.openDevTools();
//   }

//   ipcRenderer.on()
// }

// app.whenReady().then(() => {
//   createWindow();

//   app.on('activate', () => {
//     if (BrowserWindow.getAllWindows().length === 0) {
//       createWindow();
//     }
//   });
// });

// app.on('window-all-closed', () => {
//   if (process.platform !== 'darwin') {
//     app.quit();
//   }
// });