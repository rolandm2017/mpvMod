// electron/main.js

import { app, BrowserWindow } from 'electron'
import WebSocket from 'ws'

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url); // Not import.meta.dirname
const __dirname = dirname(__filename);

import path from 'path'
const isDev = process.argv.includes('--dev') || !app.isPackaged

let mpvWS
let mainWindow; 

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'), // Make sure this path is correct
        },
    })

    // In development, load from Vite dev server
    // In production, load from built files
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173') // Vite's default dev server
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    }

    if (isDev) {
        mainWindow.webContents.openDevTools()
    }

     mainWindow.once('ready-to-show', () => {
        connectMPV(); // Move here instead
    });
}

function connectMPV() {
    mpvWS = new WebSocket('ws://localhost:8765');
    
    mpvWS.on('open', () => {
        console.log('Connected to MPV server');
    });
    
    mpvWS.on('message', (data) => {
        console.log("connectMPV onMessage")
        try {
            const parsed = JSON.parse(data);
            console.log(parsed, "57ru")
            // Send to renderer
            if (mainWindow && !mainWindow.isDestroyed()) {
                console.log("sending something to webContents")
                mainWindow.webContents.send('mpv-state', {
                    pos: parsed.position || 0,
                    dur: parsed.duration || 0,
                    play: parsed.playing || false,
                    ts: Date.now()
                });
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


app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
    if (mpvWS) {
        mpvWS.close();
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})
