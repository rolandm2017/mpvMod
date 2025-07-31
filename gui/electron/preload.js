// electron/preload.js

const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loaded!');

contextBridge.exposeInMainWorld('electronAPI', {
    getHotkeys: () => ipcRenderer.invoke('get-hotkeys'),
    saveHotkeys: (hotkeys) => ipcRenderer.invoke('save-hotkeys', hotkeys),

    onMPVState: (callback) => {
        console.log('onMPVState called');
        ipcRenderer.on('mpv-state', (event, data) => {
            // console.log("in mpv state receiver", data)
            callback(data);
        });
    },

    // Remove listener to prevent memory leaks
    removeMPVListener: () => {
        ipcRenderer.removeAllListeners('mpv-state');
    },

    takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
    startAudioClip: () => ipcRenderer.invoke('start-audio-clip'),
    endAudioClip: () => ipcRenderer.invoke('end-audio-clip'),
    getMPVStatus: () => ipcRenderer.invoke('get-mpv-status'),

    onScreenshotReady: (callback) => {
        ipcRenderer.on('screenshot-ready', (event, dataURL) =>
            callback(dataURL)
        );
    },
});

console.log('electronAPI exposed to window');
