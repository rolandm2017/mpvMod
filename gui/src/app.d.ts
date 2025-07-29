// See https://svelte.dev/docs/kit/types#app.d.ts

import type { ElectronAPI } from '$lib/interfaces';
import type { SubtitleDatabase } from '$lib/utils/subtitleDatabase';

// for information about these interfaces
declare global {
    namespace App {
        // interface Error {}
        // interface Locals {}
        // interface PageData {}
        // interface PageState {}
        // interface Platform {}
    }

    interface Window {
        electronAPI: ElectronAPI;
        testData: {
            db: SubtitleDatabase;
            allSegmentsMounted: boolean;
        };
    }
}

export {};
