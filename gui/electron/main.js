// electron/main.js

import { app, BrowserWindow, ipcMain, screen } from 'electron';
import WebSocket from 'ws';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

import dotenv from 'dotenv';
import Store from 'electron-store';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import path from 'path';
const isDev = process.argv.includes('--dev') || !app.isPackaged;

if (isDev) {
    process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
}

let mpvWS;
let mainWindow;

const store = new Store();

function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();

    const displays = screen.getAllDisplays();

    const targetMonitor = process.env.ELECTRON_MONITOR || 0;
    const targetDisplay = displays[parseInt(targetMonitor)] || displays[0];

    console.log('Target monitor index:', targetMonitor);
    console.log('Target display bounds:', targetDisplay.bounds);

    const { width: screenWidth, height: screenHeight } =
        primaryDisplay.workAreaSize;

    const windowWidth = 1400;
    const windowHeight = 1000;

    mainWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        x: screenWidth - windowWidth, // Position at rightmost edge
        y: 0, // Top of screen (you can adjust this)
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.once('ready-to-show', () => {
        connectMPV();
    });
}

function connectMPV() {
    console.log('In connectMPV');
    mpvWS = new WebSocket('ws://localhost:8765');

    mpvWS.on('open', () => {
        console.log('Connected to MPV server');
        // Send initial status request
        sendMPVCommand({ command: 'get_status' });
    });

    mpvWS.on('message', (data) => {
        try {
            const parsed = JSON.parse(data);
            // Send to renderer
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('mpv-state', parsed);
            }
        } catch (e) {
            console.error('Failed to parse MPV data:', e);
        }
    });

    mpvWS.on('close', () => {
        console.log('MPV connection closed, reconnecting...');
        setTimeout(connectMPV, 1000);
    });

    mpvWS.on('error', (error) => {
        console.error('MPV WebSocket error:', error);
    });
}

// Function to send commands to MPV server
function sendMPVCommand(command) {
    if (mpvWS && mpvWS.readyState === WebSocket.OPEN) {
        console.log('Sending command to MPV:', command);
        mpvWS.send(JSON.stringify(command));
        return true;
    } else {
        console.error('MPV WebSocket not connected');
        return false;
    }
}

// IPC handlers for renderer to send commands
ipcMain.handle('send-mpv-command', (event, command) => {
    return sendMPVCommand(command);
});

ipcMain.handle('take-screenshot', () => {
    return sendMPVCommand({ command: 'take_screenshot' });
});

ipcMain.handle('start-audio-clip', () => {
    return sendMPVCommand({ command: 'start_audio_clip' });
});

ipcMain.handle('end-audio-clip', () => {
    return sendMPVCommand({ command: 'end_audio_clip' });
});

ipcMain.handle('get-mpv-status', () => {
    return sendMPVCommand({ command: 'get_status' });
});

// Existing hotkey handlers
ipcMain.handle('get-hotkeys', () => {
    return store.get('hotkeys', {});
});

ipcMain.handle('save-hotkeys', (event, hotkeys) => {
    store.set('hotkeys', hotkeys);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
    if (mpvWS) {
        mpvWS.close();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
