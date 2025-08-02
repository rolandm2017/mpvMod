import type { SubtitleTiming, TimecodeString } from '$lib/types';
import type { ParsedSegmentObj } from '../../routes/+page.server';

export function parseSrtFileIntoSegments(blocks: string[]) {
    return blocks
        .map((block) => {
            const lines = block.trim().split('\n');
            if (lines.length >= 3) {
                const timecode = lines[1];
                return {
                    index: parseInt(lines[0]),
                    timecode,
                    text: lines
                        .slice(2)
                        .join('\n')
                        .replace(/<[^>]*>/g, ''),
                    startTimeSeconds: parseTimecodeToSeconds(timecode.split(' --> ')[0]) // Parse start time
                };
            }
        })
        .filter((seg): seg is ParsedSegmentObj => Boolean(seg))
        .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds); // Ensure sorted
}

export function prebuildLookupArrays(segments: ParsedSegmentObj[]) {
    const subtitleTimingToTimecodesMap: Map<SubtitleTiming, TimecodeString> = new Map(
        segments.map((s) => [s.startTimeSeconds, s.timecode])
    );

    // Don't call this a timestamp!
    const subtitleCuePointsInSec: SubtitleTiming[] = segments.map((s) => s.startTimeSeconds);
    const timecodes: TimecodeString[] = segments.map((s) => s.timecode);

    return { subtitleTimingToTimecodesMap, subtitleCuePointsInSec, timecodes };
}

export function parseTimecodeToSeconds(timecode: TimecodeString): number {
    /* Expects the --> to be split off first */
    const parts = timecode.split(':');
    if (parts.length >= 3) {
        const hours = parseInt(parts[0], 10) || 0;
        const minutes = parseInt(parts[1], 10) || 0;
        const secondsAndMs = parts[2].split(',');
        const seconds = parseInt(secondsAndMs[0], 10) || 0;
        const msInt = parseInt(secondsAndMs[1], 10) || 0;

        // Convert milliseconds to fraction of a second, rounded to 3 decimals
        const fractional = Math.round((msInt / 1000) * 1000) / 1000;

        return hours * 3600 + minutes * 60 + seconds + fractional;
    }
    return 0;
}
