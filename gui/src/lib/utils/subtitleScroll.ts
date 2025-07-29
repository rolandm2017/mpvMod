import type { PlayerPosition, SubtitleTiming, TimecodeString } from '$lib/types';
import type { SubtitleHeights } from './SubtitleHeights';

export class Finder {
	static findPlayerTimeForSubtitleIndex(
		playerPosition: PlayerPosition,
		subtitleCuePointsArr: SubtitleTiming[]
	) {
		/**
		 * For finding a subtitle that goes with a playerPosition.
		 *
		 * Match the biggest timestamp subtitle still smaller than the playerPosition.
		 * Said another way, the subtitle plays until it is over!
		 * The subtitle's start time is smaller than the playerPosition, hence it still plays,
		 * until there is another subtitle with a start time smaller than the playerPosition.
		 *
		 * @returns {SubtitleTiming} the subtitle associated with that playerPosition
		 */
		let left = 0,
			right = subtitleCuePointsArr.length - 1;
		let result = -1;

		while (left <= right) {
			const mid = Math.floor((left + right) / 2);

			if (subtitleCuePointsArr[mid] <= playerPosition) {
				result = mid; // This could be our answer
				left = mid + 1; // Look for something larger
			} else {
				right = mid - 1; // Look for something smaller
			}
		}

		console.log('RESULT: ', result);

		return result === -1 ? 0 : subtitleCuePointsArr[result];
	}

	static findSubtitleIndexAtPlayerTime(
		playerPosition: PlayerPosition,
		cuePointsInSecArr: SubtitleTiming[]
	): number {
		/**
		 * Used to take the position of a subtitle cue point in sec and find the most relevant subtitle.
		 *
		 * @returns {number} the index of the subtitle associated with that player position
		 */
		let left = 0,
			right = cuePointsInSecArr.length - 1;
		let result = -1;

		while (left <= right) {
			const mid = Math.floor((left + right) / 2);
			if (cuePointsInSecArr[mid] <= playerPosition) {
				result = mid;
				left = mid + 1;
			} else {
				right = mid - 1;
			}
		}
		return result === -1 ? 0 : result;
	}
}

// Usage
// const index = findTimestampIndex(n, data.timestamps);
// const timecode = data.timecodes[index];

export function scrollToClosestSubtitle(
	playerPosition: PlayerPosition,
	subtitleCuePointsArr: SubtitleTiming[],
	subtitleHeights: SubtitleHeights,
	scrollContainer: HTMLDivElement
) {
	/*
	 * @param playerPosition - the playerPosition of the frame
	 * @param subtitleCuePointsArr - an arr of all subtitle's start times
	 */
	console.log('Scrolling for ', playerPosition);
	const corresponding: number = Finder.findSubtitleIndexAtPlayerTime(
		playerPosition,
		subtitleCuePointsArr
	);
	console.log('corresponding: ', corresponding);
	const heightForSub = subtitleHeights.getHeight(corresponding) ?? 0;

	// WANT: viewport at position of related subtitle
	console.log(heightForSub, 'found height');
	scrollToLocation(heightForSub, scrollContainer);
	return heightForSub; // TODO: Try "corresponding", try storing parseTimecodeToSeconds(timecode)
}

export function scrollToLocation(location: number, scrollContainer: HTMLDivElement) {
	scrollContainer.scrollTo({
		top: location,
		behavior: 'auto' // "auto", or "smooth"
	});
}

export function parseTimecodeToSeconds(timecode: TimecodeString): SubtitleTiming {
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
