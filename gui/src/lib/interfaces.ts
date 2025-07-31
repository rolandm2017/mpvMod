export interface MPVStateData {
    content: string;
    formatted_duration: string;
    formatted_time: string;
    progress: number;
    time_pos: number;
    timestamp: number;
    type: string;
}

export interface ElectronAPI {
    onMPVState: (callback: (data: MPVStateData) => void) => void;
    removeMPVListener: () => void;
    getHotkeys: () => HotkeyRegister;
    saveHotkeys: (hotkeys: any) => void;
}

export interface HotkeyRegister {
    screenshot: string;
    audioClip: string;
    copySubtitle: string;
    copyTargetWord: string;
}
