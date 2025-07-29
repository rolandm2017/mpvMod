import { describe, it, expect, vi } from 'vitest';
import path from 'path';
import fs from 'fs';

import {
    parseSrtFileIntoSegments,
    prebuildLookupArrays,
} from '$lib/utils/parsing';
import { SubtitleHeights } from '../src/lib/utils/subtitleHeights';
import { SubtitleDatabase } from '../src/lib/utils/subtitleDatabase';
import type { SubtitleTiming, TimecodeString } from '$lib/types';
import type { ParsedSegmentObj } from '../src/routes/+page.server';

import { SUBTITLE_CONSTANTS } from '$lib/constants';

describe('PageServerLoad file loading', () => {
    const SRT_FILE_PATH = path.resolve('sample.srt');
    const content = fs.readFileSync(SRT_FILE_PATH, 'utf-8');
    const blocks: string[] = content.trim().split(/\n\s*\n/);
    it('parses the dummy SRTs into SRT objects', () => {
        const segments = parseSrtFileIntoSegments(blocks);

        expect(segments.length).toBe(SUBTITLE_CONSTANTS.TOTAL_COUNT);

        // indices increase linearlyh
        const indices = segments.map((s) => s.index);
        expect(indices).toEqual([...indices].sort((a, b) => a - b));

        // start times increase linearly
        const times = segments.map((s) => s.startTimeSeconds);
        expect(times).toEqual([...times].sort((a, b) => a - b));
    });

    it('prebuilds the lookup arrays', () => {
        // so they can be ignored later
        const segments = parseSrtFileIntoSegments(blocks);

        const {
            subtitleTimingToTimecodesMap,
            subtitleCuePointsInSec,
            timecodes,
        } = prebuildLookupArrays(segments);

        // every timecode is in the timecodes arr
        segments.forEach((s) => {
            expect(timecodes).toContain(s.timecode);
        });

        // every SRT timing is mapped
        segments.forEach((s) => {
            expect(
                subtitleTimingToTimecodesMap.get(s.startTimeSeconds)
            ).toBeDefined();
        });

        // all the start times are in the cue points arr
        segments.forEach((s) => {
            expect(subtitleCuePointsInSec).toContain(s.startTimeSeconds);
        });
    });
});
