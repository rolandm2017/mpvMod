// See https://svelte.dev/docs/kit/types#app.d.ts

import type { ElectronAPI } from '$lib/interfaces';
import type { SegmentMountingTracker } from '$lib/utils/SegmentMountingTracker';
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
        db: SubtitleDatabase;
        tracker: SegmentMountingTracker;
        allSegmentsMounted: boolean;
        testInteger: number;
        callcount: number;
    }
}

export {};
