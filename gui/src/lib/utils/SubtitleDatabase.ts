import { findTimestampIndex } from './subtitleScroll';

export class SubtitleDatabase {
	/*
	 *   Problem statent: It's a gong show trying to wrangle data from one representation
	 * into another.
	 *   Solution statement: Expose only an interface for accesssing transformations.
	 * Don't transform data any other way. Handle it all under the hood.
	 *
	 */

	subtitles: Subtitle[] = [];

	timePositionsToTimecodes = new Map<number, string>();

	timestamps: number[] = [];
	timecodes: string[] = [];

	constructor(
		segments: Subtitle[],
		timeMap: Map<number, string>,
		timestamps: number[],
		timecodes: string[]
	) {
		this.subtitles = segments;

		this.timePositionsToTimecodes = timeMap;

		this.timestamps;
		this.timecodes;
	}

	// TODO: Get subtitle timecode ->  Height
	// TODO: Get player timestamp -> Height
	// TODO: Get player timestamp -> timecode

	getTimecodeForTimestamp(timestamp: number) {
		const index = findTimestampIndex(timestamp, this.timestamps);
		return this.timecodes[index];
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
