import { findPositionIndex, parseTimecodeToSeconds } from './subtitleScroll';

export class SubtitleDatabase {
	/*
	 *   Problem statent: It's a gong show trying to wrangle data from one representation
	 * into another.
	 *   Solution statement: Expose only an interface for accesssing transformations.
	 * Don't transform data any other way. Handle it all under the hood.
	 *
	 */

	subtitles: Subtitle[] = [];

	subtitleHeights: SubtitleHeights;

	timePositionsToTimecodes = new Map<number, string>();

	// the next two are a pair!
	subtitleCuePointsInSec: number[] = [];
	timecodes: string[] = [];

	constructor(
		segments: Subtitle[],
		timeMap: Map<number, string>,
		subtitleCuePointsInSec: number[],
		timecodes: string[]
	) {
		// timecodeAsSeconds, height
		this.subtitleHeights = new SubtitleHeights();

		this.subtitles = segments;

		this.timePositionsToTimecodes = timeMap;

		// the next two are a pair!
		this.subtitleCuePointsInSec = subtitleCuePointsInSec;
		this.timecodes = timecodes;
	}

	// Class covers:
	//      - Get subtitle timecode ->  Height
	//      - Get player timestamp -> Height
	//      - Get player timestamp -> timecode

	getHeightFromTimecode(code: string) {
		const timecodeAsSeconds = parseTimecodeToSeconds(code);
		return this.subtitleHeights.getHeight(timecodeAsSeconds);
	}

	getHeightFromPlayerPosition(position: number) {
		return this.subtitleHeights.getHeight(position);
	}

	getTimecodeForPlayerPosition(subtitleCuePointInSec: number) {
		const index = findPositionIndex(subtitleCuePointInSec, this.subtitleCuePointsInSec);
		return this.timecodes[index];
	}

	getPlayerPositionFromTimecode(timecode: string) {
		// Claude asks, "do you really need 'closest without exceeding' here?"
		// and in truth I'm too tired to say
		const index = this.timecodes.indexOf(timecode);
		return this.subtitleCuePointsInSec[index];
	}
}

export class Subtitle {
	text: string;
	timecode: string;
	timecodeInSeconds: number;
	height: number = 0;

	constructor(text: string, timecode: string, timecodeInSeconds: number) {
		this.text = text;
		this.timecode = timecode;
		this.timecodeInSeconds = timecodeInSeconds;
	}

	setHeight(height: number) {
		this.height = height;
	}
}
