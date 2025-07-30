import { describe, it, expect, vi } from 'vitest';
import path from 'path';
import fs from 'fs';

import { SegmentMountingTracker } from '$lib/utils/mountingTracker';
import { SubtitleDatabase } from '$lib/utils/subtitleDatabase';
import type { SubtitleTiming, TimecodeString } from '$lib/types';

describe('SegmentMountingTracker', () => {
    const fakeDiv = {} as HTMLDivElement;

    const timecodes: TimecodeString[] = ['1.0', '5.5', '10.5', '15.5'];
    const timings: SubtitleTiming[] = [1.0, 5.5, 10.0, 15.5];
    const timePositionsToTimecodes = new Map<SubtitleTiming, TimecodeString>();
    timePositionsToTimecodes.set(timings[0], '1.0');
    timePositionsToTimecodes.set(timings[1], '5.5');
    timePositionsToTimecodes.set(timings[2], '10.5');
    timePositionsToTimecodes.set(timings[2], '15.5');

    const db = new SubtitleDatabase(
        [],
        timePositionsToTimecodes,
        timings,
        timecodes
    );

    it('keeps track of what is mounted', () => {
        const m = new SegmentMountingTracker(11);

        m.storeSegmentPosition('12345', 5000, fakeDiv, db);
        m.storeSegmentPosition('12346', 5001, fakeDiv, db);
        m.storeSegmentPosition('12347', 5002, fakeDiv, db);
        m.storeSegmentPosition('12348', 5003, fakeDiv, db);

        const stats = m.getStats();

        expect(stats.allMounted).toBe(false);
        expect(stats.mountedCount).toBe(4);
        expect(stats.expectedCount).toBe(11);
        expect(stats.mountedTimecodes.includes('12345')).toBe(true);
        expect(stats.mountedTimecodes.includes('12346')).toBe(true);
        expect(stats.mountedTimecodes.includes('12347')).toBe(true);
        expect(stats.mountedTimecodes.includes('12348')).toBe(true);
        expect(stats.mountedTimecodes.includes('asdfsfaasdf')).toBe(false);
    });

    it('tracks duplicates', () => {
        const m = new SegmentMountingTracker(11);

        m.storeSegmentPosition('40099', 4099, fakeDiv, db);
        m.storeSegmentPosition('40099', 4099, fakeDiv, db);
        m.storeSegmentPosition('40100', 40100, fakeDiv, db);
        m.storeSegmentPosition('40100', 40100, fakeDiv, db);

        const stats = m.getStats();

        const keys = Object.keys(stats.duplicates); // ["00:01:23", "00:02:45", "00:05:10"]
        const values = Object.values(stats.duplicates); // [3, 2, 4]

        expect(keys.includes('40099'));
        expect(keys.includes('40100'));

        expect(values[0]).toBe(2);
        expect(values[1]).toBe(2);
    });
});
