import fs from 'fs';
import path from 'path';
import type { PageServerLoad } from './$types';
import type { SubtitleTiming, TimecodeString } from '$lib/types';
import { parseSrtFileIntoSegments, prebuildLookupArrays } from '$lib/utils/parsing';

export type ParsedSegmentObj = {
    index: number;
    timecode: TimecodeString;
    text: string;
    startTimeSeconds: SubtitleTiming; // Add pre-parsed timestamp
};

export const load: PageServerLoad = async () => {
    let segments: ParsedSegmentObj[] = [];

    // "subtitleStartInSec" -> Don't call this a timestamp!
    // Need to keep both: " i want is to be able to search for the startTimeSeconds
    // that is closest to n but not exceeding n, and get the timecode from it"
    // https://claude.ai/chat/82b6c551-ecff-4e57-8de1-5d01a294c5ed

    const SRT_FILE_PATH = path.resolve('sample.srt');

    if (fs.existsSync(SRT_FILE_PATH)) {
        const content = fs.readFileSync(SRT_FILE_PATH, 'utf-8');
        const blocks: string[] = content.trim().split(/\n\s*\n/);
        // .slice(0, 4);

        segments = parseSrtFileIntoSegments(blocks);
    }

    // Pre-build lookup arrays for the client
    const { subtitleTimingToTimecodesMap, subtitleCuePointsInSec, timecodes } = prebuildLookupArrays(segments);

    return {
        segments,
        subtitleTimingToTimecodesMap,
        subtitleCuePointsInSec, // is in order already
        timecodes // is in order already
    };
};
