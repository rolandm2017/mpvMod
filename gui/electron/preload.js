// electron/preload.js

const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loaded!');

contextBridge.exposeInMainWorld('electronAPI', {
    onMPVState: (callback) => {
        console.log('onMPVState called');
        ipcRenderer.on('mpv-state', (event, data) => {
            callback(data);
        });
    },
    
    // Remove listener to prevent memory leaks
    removeMPVListener: () => {
        ipcRenderer.removeAllListeners('mpv-state');
    }
});

console.log('electronAPI exposed to window');