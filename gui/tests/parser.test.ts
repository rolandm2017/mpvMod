import { describe, it, expect, vi } from 'vitest';
import path from 'path';
import fs from 'fs';

import {
    parseSrtFileIntoSegments,
    parseTimecodeToSeconds,
    prebuildLookupArrays,
} from '$lib/utils/parsing';
import { SubtitleHeights } from '../src/lib/utils/subtitleHeights';
import { SubtitleDatabase } from '../src/lib/utils/subtitleDatabase';
import type { SubtitleTiming, TimecodeString } from '$lib/types';
import type { ParsedSegmentObj } from '../src/routes/+page.server';

import { SUBTITLES } from '$lib/constants';

function checkDuplicateTimecodes(segments: ParsedSegmentObj[]): boolean {
    const timecodes = segments.map((s) => s.timecode);
    const duplicates = timecodes.filter((tc, i) => timecodes.indexOf(tc) !== i);

    if (duplicates.length > 0) {
        console.log('Duplicate timecodes found:', [...new Set(duplicates)]);
        return true;
    }
    return false;
}

// FIXME: make subtitle timings be rounded to 2-3 decimal places. Expect ZERO dupes
// FIXME:L Thus Parser needds to have milliiseconds

function checkDuplicateSubtitleTimings(segments: ParsedSegmentObj[]): boolean {
    const timings = segments.map((s) => s.startTimeSeconds);
    const duplicates = timings.filter((tc, i) => timings.indexOf(tc) !== i);

    if (duplicates.length > 0) {
        console.log('Duplicate timings found:', [...new Set(duplicates)]);
        return true;
    }
    return false;
}

describe('Parser', () => {
    it('handles a block including milliseocnds', () => {
        const blocks1 = `
            425
            00:20:24,427 --> 00:20:24,968
            C'est l'heure du Boquerat !
        `;
        const blocks2 = `
            426
            00:20:24,988 --> 00:20:42,210
            Contentez-vous de chanter, moi je m'occupe de la partie la plus difficile !`;

        const blocks3 = `
            427
            00:20:42,230 --> 00:20:42,410
            On y va !`;
        const p1 = parseTimecodeToSeconds(blocks1.split(' --> ')[0]);
        const p2 = parseTimecodeToSeconds(blocks2.split(' --> ')[0]);
        const p3 = parseTimecodeToSeconds(blocks3.split(' --> ')[0]);

        expect(p1 % 1).toBeCloseTo(0.427, 3);
        expect(p2 % 1).toBeCloseTo(0.988, 3);
        expect(p3 % 1).toBeCloseTo(0.23, 3);
    });

    const SRT_FILE_PATH = path.resolve('sample.srt');
    const content = fs.readFileSync(SRT_FILE_PATH, 'utf-8');
    const blocks: string[] = content.trim().split(/\n\s*\n/);
    it('contains no duplicates', () => {
        const lines = blocks[5].trim().split('\n');
        if (lines.length >= 3) {
            const timecode = lines[1];
            const segmentOne = {
                index: parseInt(lines[0]),
                timecode,
                text: lines
                    .slice(2)
                    .join('\n')
                    .replace(/<[^>]*>/g, ''),
                startTimeSeconds: parseTimecodeToSeconds(
                    timecode.split(' --> ')[0]
                ), // Parse start time
            };
            expect(segmentOne.startTimeSeconds % 1).not.toBeCloseTo(0, 2);
        }
        const lines2 = blocks[10].trim().split('\n');
        if (lines2.length >= 3) {
            const timecode = lines2[1];
            const segmentTwo = {
                index: parseInt(lines2[0]),
                timecode,
                text: lines2
                    .slice(2)
                    .join('\n')
                    .replace(/<[^>]*>/g, ''),
                startTimeSeconds: parseTimecodeToSeconds(
                    timecode.split(' --> ')[0]
                ), // Parse start time
            };
            expect(segmentTwo.startTimeSeconds % 1).not.toBeCloseTo(0, 2);
        }

        const segments = parseSrtFileIntoSegments(blocks);
        expect(checkDuplicateTimecodes(segments)).toBe(false);

        expect(checkDuplicateSubtitleTimings(segments)).toBe(false);
    });
});
