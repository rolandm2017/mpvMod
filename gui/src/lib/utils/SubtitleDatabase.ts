import type { SubtitleSegmentObj } from '../../routes/+page.server';

class SubtitleDatabase {
	/*
	 *   Problem statent: It's a gong show trying to wrangle data from one representation
	 * into another.
	 *   Solution statement: Expose only an interface for accesssing transformations.
	 * Don't transform data any other way. Handle it all under the hood.
	 *
	 */

	subtitles: SubtitleSegmentObj[] = [];

	constructor(rawSubtitleSegments: SubtitleSegmentObj[]) {
		this.subtitles = rawSubtitleSegments;
	}
}

class Subtitle {
	text: string;
	timecode: string;
	height: number = 0;

	constructor(text: string, timecode: string) {
		this.text = text;
		this.timecode = timecode;
	}

	setHeight(height: number) {
		this.height = height;
	}
}
