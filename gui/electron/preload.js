// electron/preload.js

const { contextBridge, ipcRenderer } = require("electron");

console.log("Preload script loaded!");

contextBridge.exposeInMainWorld("electronAPI", {
    getHotkeys: () => ipcRenderer.invoke("get-hotkeys"),
    saveHotkeys: (hotkeys) => ipcRenderer.invoke("save-hotkeys", hotkeys),
    ///

    ///
    getFieldMappings: () => ipcRenderer.invoke("get-field-mappings"),
    saveFieldMappings: (mappings) => ipcRenderer.invoke("save-field-mappings", mappings),

    onMPVState: (callback) => {
        ipcRenderer.on("mpv-state", (event, data) => {
            // console.log("in mpv state receiver", data)
            callback(data);
        });
    },

    // Remove listener to prevent memory leaks
    removeMPVListener: () => {
        ipcRenderer.removeAllListeners("mpv-state");
    },

    takeScreenshot: () => ipcRenderer.invoke("take-screenshot"),
    startAudioClip: () => ipcRenderer.invoke("start-audio-clip"),
    concludeAudioClip: () => ipcRenderer.invoke("end-audio-clip"),
    getMPVStatus: () => ipcRenderer.invoke("get-mpv-status"),

    onScreenshotReady: (callback) => {
        ipcRenderer.on("screenshot-ready", (event, dataURL) => callback(dataURL));
    },
    onAudioReady: (callback) => {
        ipcRenderer.on("audio-ready", (event, dataURL) => callback(dataURL));
    },

    // file loaded, SRT ready, etc
    forwardSubtitleInfo: (callback) => {
        ipcRenderer.on("srt-content", (event, srtFileContent) => callback(srtFileContent));
    },

    // initialize
    requestDefaultAudio: () => ipcRenderer.invoke("request-default-audio"),

    onDefaultAudio: (callback) => {
        ipcRenderer.on("default-audio-ready", (event, dataURL) => {
            callback(dataURL);
        });
    }
});

console.log("electronAPI exposed to window");
