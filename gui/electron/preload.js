// electron/preload.js

const { contextBridge, ipcRenderer } = require("electron");

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
    requestSnippet: (boundaries) => ipcRenderer.invoke("create-or-update-snippet", boundaries),
    nudgeScreenshot: (definition) => ipcRenderer.invoke("nudge-screenshot", definition),
    //
    getMPVStatus: () => ipcRenderer.invoke("get-mpv-status"),

    // media goes out
    onScreenshotReady: (callback) => {
        ipcRenderer.on("screenshot-ready", (event, dataURL) => callback(dataURL));
    },
    onAudioReady: (callback) => {
        ipcRenderer.on("audio-ready", (event, dataURL) => callback(dataURL));
    },
    onSnippetReady: (callback) => {
        ipcRenderer.on("snippet-ready", (event, dataURL) => callback(dataURL));
    },

    // file loaded, SRT ready, etc
    forwardSubtitleInfo: (callback) => {
        ipcRenderer.on("srt-content", (event, srtFileContent) => callback(srtFileContent));
    },
    requestCurrentSubtitles: () => ipcRenderer.invoke("request-srt-content"),

    // initialize
    getCurrentlySavedDeck: () => ipcRenderer.invoke("load-current-deck"),
    requestDefaultAudio: () => ipcRenderer.invoke("request-default-audio"),

    onDefaultAudio: (callback) => {
        ipcRenderer.on("default-audio-ready", (event, dataURL) => {
            callback(dataURL);
        });
    }
});
