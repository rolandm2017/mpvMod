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
    // MPVstate update - time stream
    onMPVState: (callback: (data: MPVStateData) => void) => void;
    removeMPVListener: () => void;
    // hotkeys
    getHotkeys: () => HotkeyRegister;
    saveHotkeys: (hotkeys: any) => void;
    // send cmds
    takeScreenshot: () => Promise<boolean>;
    startAudioClip: () => Promise<boolean>;
    endAudioClip: () => Promise<boolean>;
    getMPVStatus: () => Promise<boolean>;
    sendMPVCommand: (command: object) => Promise<boolean>;

    // Add clipboard support
    copyToClipboard?: (text: string) => Promise<void>;

    // Add screenshot listener
    onScreenshotReady: (callback: (dataURL: string) => void) => void;
}

export interface HotkeyRegister {
    screenshot: string;
    audioClip: string;
    copySubtitle: string;
    copyWord: string;
}

export interface TakeScreenshotResponse {
    command: 'take_screenshot';
    success: boolean;
    file_path: string;
}

export interface StartAudioClipResponse {
    command: 'start_audio_clip';
    success: boolean;
}

export interface EndAudioClipResponse {
    command: 'end_audio_clip';
    success: true;
    file_path: string;
}

export interface EndAudioClipError {
    command: 'end_audio_clip';
    success: false;
    error: string;
}

export type CommandResponse =
    | TakeScreenshotResponse
    | StartAudioClipResponse
    | EndAudioClipResponse
    | EndAudioClipError;
