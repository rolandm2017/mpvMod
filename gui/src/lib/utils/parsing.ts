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
                    startTimeSeconds: parseTimecodeToSeconds(
                        timecode.split(' --> ')[0]
                    ), // Parse start time
                };
            }
        })
        .filter((seg): seg is ParsedSegmentObj => Boolean(seg))
        .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds); // Ensure sorted
}

export function prebuildLookupArrays(segments: ParsedSegmentObj[]) {
    const subtitleTimingToTimecodesMap: Map<SubtitleTiming, TimecodeString> =
        new Map(segments.map((s) => [s.startTimeSeconds, s.timecode]));

    // Don't call this a timestamp!
    const subtitleCuePointsInSec: SubtitleTiming[] = segments.map(
        (s) => s.startTimeSeconds
    );
    const timecodes: TimecodeString[] = segments.map((s) => s.timecode);

    return { subtitleTimingToTimecodesMap, subtitleCuePointsInSec, timecodes };
}

export function parseTimecodeToSeconds(
    timecode: TimecodeString
): SubtitleTiming {
    // Parse timecode format - adjust this based on your actual format
    // Example: "00:05:23.450" -> seconds
    const parts = timecode.split(':');
    if (parts.length >= 3) {
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const seconds = parseFloat(parts[2]) || 0;
        return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
}
