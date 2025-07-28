import fs from 'fs';
import path from 'path';
import type { PageServerLoad } from './$types';
import { parseTimecodeToSeconds } from '$lib/utils/subtitleScroll';

export type SubtitleSegmentObj = {
	index: number;
	timecode: string;
	text: string;
	startTimeSeconds: number; // Add pre-parsed timestamp
};

export const load: PageServerLoad = async () => {
	const SRT_FILE_PATH = path.resolve('sample.srt');
	let segments: SubtitleSegmentObj[] = [];

	if (fs.existsSync(SRT_FILE_PATH)) {
		const content = fs.readFileSync(SRT_FILE_PATH, 'utf-8');
		const blocks = content.trim().split(/\n\s*\n/);

		segments = blocks
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
			.filter((seg): seg is SubtitleSegmentObj => Boolean(seg))
			.sort((a, b) => a.startTimeSeconds - b.startTimeSeconds); // Ensure sorted
	}

	return {
		segments,
		// Pre-build lookup arrays for the client
		subtitleTimestamps: segments.map((s) => s.startTimeSeconds),
		timecodeMap: Object.fromEntries(segments.map((s) => [s.startTimeSeconds, s.timecode]))
	};
};
