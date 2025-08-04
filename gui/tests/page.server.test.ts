import { describe, it, expect, vi } from "vitest";
import path from "path";
import fs from "fs";

import { parseSrtFileIntoSegments, prebuildLookupArrays } from "$lib/utils/parsing";
import type { SubtitleTiming, TimecodeString } from "$lib/types";
import type { ParsedSegmentObj } from "../src/routes/+page.server";

import { SUBTITLES } from "$lib/constants";

function checkDuplicateTimecodes(segments: ParsedSegmentObj[]): boolean {
    const timecodes = segments.map((s) => s.timecode);
    const duplicates = timecodes.filter((tc, i) => timecodes.indexOf(tc) !== i);

    if (duplicates.length > 0) {
        console.log("Duplicate timecodes found:", [...new Set(duplicates)]);
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
        console.log("Duplicate timings found:", [...new Set(duplicates)]);
        return true;
    }
    return false;
}

describe("SRT file qualities", () => {
    const SRT_FILE_PATH = path.resolve("sample.srt");
    const content = fs.readFileSync(SRT_FILE_PATH, "utf-8");
    const blocks: string[] = content.trim().split(/\n\s*\n/);
    const segments = parseSrtFileIntoSegments(blocks);
    it("contains no duplicates", () => {
        expect(checkDuplicateTimecodes(segments)).toBe(false);
        expect(checkDuplicateSubtitleTimings(segments)).toBe(false);
    });
});

describe("PageServerLoad file loading", () => {
    const SRT_FILE_PATH = path.resolve("sample.srt");
    const content = fs.readFileSync(SRT_FILE_PATH, "utf-8");
    const blocks: string[] = content.trim().split(/\n\s*\n/);
    it("parses the dummy SRTs into SRT objects", () => {
        const segments = parseSrtFileIntoSegments(blocks);

        expect(segments.length).toBe(SUBTITLES.TOTAL_COUNT);

        // indices increase linearlyh
        const indices = segments.map((s) => s.index);
        expect(indices).toEqual([...indices].sort((a, b) => a - b));

        // start times increase linearly
        const times = segments.map((s) => s.startTimeSeconds);
        expect(times).toEqual([...times].sort((a, b) => a - b));
    });

    it("prebuilds the lookup arrays", () => {
        // so they can be ignored later
        const segments = parseSrtFileIntoSegments(blocks);

        const { subtitleTimingToTimecodesMap, subtitleCuePointsInSec, timecodes } = prebuildLookupArrays(segments);

        // every timecode is in the timecodes arr
        segments.forEach((s) => {
            expect(timecodes).toContain(s.timecode);
        });

        // every SRT timing is mapped
        segments.forEach((s) => {
            expect(subtitleTimingToTimecodesMap.get(s.startTimeSeconds)).toBeDefined();
        });

        // all the start times are in the cue points arr
        segments.forEach((s) => {
            expect(subtitleCuePointsInSec).toContain(s.startTimeSeconds);
        });

        // FIXME: DUPLICATE in subtitleCuePointsInSec: SubtitleTiming[],
    });
});
