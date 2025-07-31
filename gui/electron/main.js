// electron/main.js

import { app, BrowserWindow, ipcMain, screen } from 'electron';
import WebSocket from 'ws';

import fs from 'fs/promises';

import { fileURLToPath } from 'url';
import path, { dirname } from 'path';

import dotenv from 'dotenv';
import Store from 'electron-store';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const isDev = process.argv.includes('--dev') || !app.isPackaged;

if (isDev) {
    process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
}

const DEFAULT_SILENCE_CLIP = 'soft-rain-on-window-358384-boosted.mp3';

const BACKEND_DIR = path.join(__dirname, '../../backend'); // Adjust path as needed

let mpvWS;
let mainWindow;

const store = new Store();

console.log(new Store().path);

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
            const message = JSON.parse(data);
            // Send to renderer
            if (mainWindow && !mainWindow.isDestroyed()) {
                // TODO: Handle switch statement nicely
                if (message.type === 'time_update') {
                    mainWindow.webContents.send('mpv-state', message);
                } else if (message.type === 'status') {
                    mainWindow.webContents.send('mpv-state', message);
                } else if (
                    message.type === 'command_response' &&
                    message.command === 'take_screenshot'
                ) {
                    console.log(message, '90ru');
                    if (message.success && message.file_path) {
                        // Now you have the file_path from your Python server
                        const fullScreenshotPath = path.join(
                            BACKEND_DIR,
                            message.file_path
                        );

                        // Convert immediately:
                        loadImageAsDataURL(fullScreenshotPath).then(
                            (dataURL) => {
                                // Send to renderer via your preferred method
                                mainWindow.webContents.send(
                                    'screenshot-ready',
                                    dataURL
                                );
                            }
                        );
                    }
                } else if (
                    message.type === 'command_response' &&
                    message.command === 'end_audio_clip'
                ) {
                    console.log(message, '126ru');
                    if (message.success && message.file_path) {
                        // Now you have the file_path from your Python server
                        const fullMp3Path = path.join(
                            BACKEND_DIR,
                            message.file_path
                        );

                        // Convert immediately:
                        loadAudioAsDataURL(fullMp3Path)
                            .then((dataURL) => {
                                mainWindow.webContents.send(
                                    'audio-ready',
                                    dataURL
                                );
                            })
                            .catch((error) => {
                                console.error('Failed to load audio:', error);
                            });
                    }
                } else {
                    console.log('Unaught type:', message.type, message.command);
                    mainWindow.webContents.send('mpv-state', message);
                }
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

async function loadImageAsDataURL(filePath) {
    try {
        const imageBuffer = await fs.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
        const base64 = imageBuffer.toString('base64');
        return `data:${mimeType};base64,${base64}`;
    } catch (error) {
        throw new Error(`Failed to load image: ${error.message}`);
    }
}

async function loadAudioAsDataURL(filePath) {
    try {
        const audioBuffer = await fs.readFile(filePath);
        const base64 = audioBuffer.toString('base64');
        return `data:audio/mpeg;base64,${base64}`;
    } catch (error) {
        throw new Error(`Failed to load audio: ${error.message}`);
    }
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

ipcMain.handle('request-default-audio', async () => {
    console.log('Manual request for default audio received');
    await loadDefaultSilenceAudio();
    return true;
});

// Function to load and send the default silence audio
async function loadDefaultSilenceAudio() {
    try {
        const defaultAudioPath = path.join(__dirname, DEFAULT_SILENCE_CLIP);
        console.log(
            'Attempting to load default silence audio from:',
            defaultAudioPath
        );

        // Check if file exists first
        try {
            await fs.access(defaultAudioPath);
            console.log('File exists at:', defaultAudioPath);
        } catch (accessError) {
            console.error('File does not exist at:', defaultAudioPath);

            // Try alternative path in case the file is in gui/electron/
            const altPath = path.join(__dirname, '../' + DEFAULT_SILENCE_CLIP);
            console.log('Trying alternative path:', altPath);

            try {
                await fs.access(altPath);
                console.log('File found at alternative path:', altPath);
                const audioDataURL = await loadAudioAsDataURL(altPath);

                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send(
                        'default-audio-ready',
                        audioDataURL
                    );
                    console.log(
                        'Default silence audio sent to renderer from alt path'
                    );
                }
                return;
            } catch (altAccessError) {
                console.error(
                    'File not found at alternative path either:',
                    altPath
                );
                throw new Error(
                    `File not found at ${defaultAudioPath} or ${altPath}`
                );
            }
        }

        const audioDataURL = await loadAudioAsDataURL(defaultAudioPath);

        if (mainWindow && !mainWindow.isDestroyed()) {
            console.log(
                'Sending default audio via IPC channel: default-audio-ready'
            );
            console.log('Audio data URL length:', audioDataURL.length);
            mainWindow.webContents.send('default-audio-ready', audioDataURL);
            console.log('Default silence audio sent to renderer');
        }
    } catch (error) {
        console.error('Failed to load default silence audio:', error);
    }
}
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
