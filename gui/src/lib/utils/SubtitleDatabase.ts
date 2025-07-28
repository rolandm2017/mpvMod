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

	constructor(segments: Subtitle[]) {
		this.subtitles = segments;
	}

	// TODO: Get subtitle timecode ->  Height
	// TODO: Get player timestamp -> Height
	// TODO: Get player timestamp -> subtitle timecode
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
