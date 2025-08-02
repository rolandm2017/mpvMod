import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock SvelteKit runtime
vi.stubGlobal('app', {
    invalidate: () => {},
    invalidateAll: () => {},
    preloadCode: () => {},
    preloadData: () => {}
});

// Force client-side environment
vi.stubGlobal('window', globalThis);
vi.stubGlobal('document', globalThis.document);

// Mock AudioContext class
class MockAudioContext {
    state = 'running';
    sampleRate = 44100;
    destination = {};

    createGain() {
        return {
            connect: () => {},
            disconnect: () => {},
            gain: { value: 1 }
        };
    }

    createScriptProcessor() {
        return {
            connect: () => {},
            disconnect: () => {},
            onaudioprocess: null
        };
    }

    decodeAudioData() {
        return Promise.resolve({
            length: 1000,
            sampleRate: 44100,
            getChannelData: () => new Float32Array(1000)
        });
    }

    close() {
        return Promise.resolve();
    }
}

// Use vi.stubGlobal to properly mock AudioContext
vi.stubGlobal('AudioContext', MockAudioContext);
vi.stubGlobal('webkitAudioContext', MockAudioContext);

// Mock Audio class
class MockAudio {
    src: string;
    duration: number = 120;
    currentTime: number = 0;
    paused: boolean = true;
    ended: boolean = false;
    volume: number = 1;
    playbackRate: number = 1;
    readyState: number = 4;
    networkState: number = 1;
    private _listeners: Record<string, Function[]> = {};

    constructor(src?: string) {
        this.src = src || '';
    }

    addEventListener(event: string, callback: Function) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(callback);

        // Auto-trigger loadedmetadata for testing
        if (event === 'loadedmetadata') {
            setTimeout(() => callback(), 0);
        }
    }

    removeEventListener(event: string, callback: Function) {
        if (this._listeners[event]) {
            const index = this._listeners[event].indexOf(callback);
            if (index > -1) this._listeners[event].splice(index, 1);
        }
    }

    play() {
        this.paused = false;
        this._trigger('play');
        return Promise.resolve();
    }

    pause() {
        this.paused = true;
        this._trigger('pause');
    }

    load() {
        this._trigger('loadstart');
        setTimeout(() => {
            this._trigger('loadedmetadata');
            this._trigger('loadeddata');
            this._trigger('canplay');
            this._trigger('canplaythrough');
        }, 0);
    }

    private _trigger(event: string) {
        if (this._listeners[event]) {
            this._listeners[event].forEach((callback) => callback());
        }
    }
}

// Use vi.stubGlobal for Audio as well
vi.stubGlobal('Audio', MockAudio);

// Mock Canvas API
// @ts-ignore  // here, replace this line
global.HTMLCanvasElement.prototype.getContext = function (contextType) {
    if (contextType === '2d') {
        return {
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 1,
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            stroke: () => {},
            fill: () => {},
            fillRect: () => {},
            clearRect: () => {},
            arc: () => {},
            closePath: () => {},
            save: () => {},
            restore: () => {},
            scale: () => {},
            translate: () => {},
            rotate: () => {},
            measureText: () => ({ width: 0 }),
            getImageData: () => ({ data: new Uint8ClampedArray(4) }),
            putImageData: () => {},
            createLinearGradient: () => ({
                addColorStop: () => {}
            }),
            canvas: {
                width: 800,
                height: 100
            }
        };
    }
    return null;
};

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback) => {
    return setTimeout(callback, 16); // ~60fps
};

global.cancelAnimationFrame = (id) => {
    clearTimeout(id);
};

// Mock URL.createObjectURL
global.URL.createObjectURL = () => 'blob:mock-url';
global.URL.revokeObjectURL = () => {};

// Mock ResizeObserver
global.ResizeObserver = class MockResizeObserver {
    // @ts-ignore
    constructor(callback) {
        // @ts-ignore
        this.callback = callback;
    }

    observe() {}
    unobserve() {}
    disconnect() {}
};

// Mock IntersectionObserver
// @ts-ignore
global.IntersectionObserver = class MockIntersectionObserver {
    // @ts-ignore
    constructor(callback) {
        // @ts-ignore
        this.callback = callback;
    }

    observe() {}
    unobserve() {}
    disconnect() {}
};

// Suppress console warnings during tests
const originalWarn = console.warn;
console.warn = (...args) => {
    const message = args[0];
    if (
        typeof message === 'string' &&
        (message.includes('AudioContext') || message.includes('WaveSurfer') || message.includes('canvas'))
    ) {
        return; // Suppress audio/canvas related warnings
    }
    originalWarn.apply(console, args);
};
