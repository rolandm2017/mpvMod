import type { SubtitleTiming, TimecodeString } from "./types";

export type ParsedSegmentObj = {
    index: number;
    timecode: TimecodeString;
    text: string;
    startTimeSeconds: SubtitleTiming; // Add pre-parsed timestamp
};

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
    // communicate hotkey to MPV
    registerHotkey: (hotkeys: any) => void;
    // field mappings CRUD
    getFieldMappings: () => SelectedDeckInfo;
    saveFieldMappings: (mappings: any) => void;

    // send cmds
    takeScreenshot: () => Promise<boolean>;
    startAudioClip: () => Promise<boolean>;
    concludeAudioClip: () => Promise<boolean>;
    // cut out a subsection of the mp3
    requestSnippet: (boundaries: SnippetRequest) => void;
    nudgeScreenshot: (timeChange: ScreenshotNudgeRequest) => void;
    getMPVStatus: () => Promise<boolean>;
    sendMPVCommand: (command: object) => Promise<boolean>;

    // Clipboard support
    copyToClipboard?: (text: string) => Promise<void>;

    // Screenshot listener
    onScreenshotReady: (callback: (dataURL: string) => void) => void;
    onAudioReady: (callback: (dataURL: string) => void) => void;
    onSnippetReady: (callback: (dataURL: string) => void) => void;

    // Load file, get SRT path, etc
    forwardSubtitleInfo: (callback: (srtFileContent: string) => void) => void;
    requestCurrentSubtitles: (callback: (srtFileContent: string) => void) => void;

    // Init
    getCurrentlySavedDeck: () => Promise<string>;
    onDefaultAudio: (callback: (nullishMp3File: string) => void) => void;
    requestDefaultAudio: () => void;
}

export interface SnippetRequest {
    start: number;
    end: number;
    sourceFile: "latest";
}

export interface ScreenshotNudgeRequest {
    changeInMilliseconds: number;
}

export interface HotkeyRegister {
    screenshot: string;
    audioClip: string;
    copySubtitle: string;
    copyWord: string;
}

export interface SelectedDeckInfo {
    selectedDeck: string;
    selectedNoteType: string;
    fieldMappings: FieldMappings;
}

export interface FieldMappings {
    targetWord: string;
    exampleSentence: string;
    nativeTranslation: string;
    sentenceAudio: string;
    screenshot: string;
}

export interface TakeScreenshotResponse {
    command: "take_screenshot";
    success: boolean;
    file_path: string;
}

export interface StartAudioClipResponse {
    command: "start_audio_clip";
    success: boolean;
}

export interface ConcludeAudioClipResponse {
    command: "end_audio_clip";
    success: true;
    file_path: string;
}

export interface ConcludeAudioClipError {
    command: "end_audio_clip";
    success: false;
    error: string;
}

export type CommandResponse =
    | TakeScreenshotResponse
    | StartAudioClipResponse
    | ConcludeAudioClipResponse
    | ConcludeAudioClipError;

export interface BasicCardDeliverable {
    targetDeck: string;
    word: string;
    exampleSentence: string;
    nativeTranslation: string;
    audio: string; // a dataUrl
    image: string; // a dataUrl
}
