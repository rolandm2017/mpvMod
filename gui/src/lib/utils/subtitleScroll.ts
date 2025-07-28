export function scrollToClosestSubtitle(
	timePosition: number,
	timesArr: number[],
	subtitleHeights: Map<number, number>,
	scrollContainer: HTMLDivElement
) {
	/*
	 * @param timePosition - the timePosition of the frame
	 * @param timesArr - an arr of all subtitle's start times
	 */
	console.log('Scrolling for ', timePosition);
	const corresponding: number = findCorrespondingSubtitleTime(timePosition, timesArr);
	console.log('corresponding: ', corresponding);
	const heightForSub = subtitleHeights.get(corresponding) ?? 0;

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

export function findCorrespondingSubtitleTime(timestamp: number, times: number[]) {
	/*
	 * Match the biggest number still smaller than the timestamp.
	 * Said another way, the subtitle plays until it is over!
	 * The subtitle's start time is smaller than the timestamp, hence it still plays,
	 * until there is another subtitle with a start time smaller than the timestamp.
	 */
	let left = 0,
		right = times.length - 1;
	let result = -1;

	while (left <= right) {
		const mid = Math.floor((left + right) / 2);

		if (times[mid] <= timestamp) {
			result = mid; // This could be our answer
			left = mid + 1; // Look for something larger
		} else {
			right = mid - 1; // Look for something smaller
		}
	}

	console.log('RESULT: ', result);

	return result === -1 ? 0 : times[result];
}

export function findTimestampIndex(target: number, timestamps: number[]): number {
	let left = 0,
		right = timestamps.length - 1;
	let result = -1;

	while (left <= right) {
		const mid = Math.floor((left + right) / 2);
		if (timestamps[mid] <= target) {
			result = mid;
			left = mid + 1;
		} else {
			right = mid - 1;
		}
	}
	return result === -1 ? 0 : result;
}

// Usage
// const index = findTimestampIndex(n, data.timestamps);
// const timecode = data.timecodes[index];

export function parseTimecodeToSeconds(timecode: string): number {
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
