<script lang="ts">
	import { onMount, onDestroy, getContext } from 'svelte';

	import CardBuilder from '$lib/CardBuilder.svelte';
	import SubtitleSegment from '$lib/SubtitleSegment.svelte';

	import {
		findCorrespondingSubtitleTime,
		parseTimecodeToSeconds,
		scrollToClosestSubtitle
	} from '$lib/utils/subtitleScroll.js';

	export let data;

	let scrollContainer: HTMLDivElement;

	let currentHighlightedElement: HTMLDivElement | null = null;
	let currentHighlightedTimecode = '';
	let segmentElements = new Map<string, HTMLDivElement>(); // timecode -> element reference

	const timePositionsToTimecodes = new Map<number, string>();

	/*
	 * I have to go from, so, the timestamp, i'm using that to decide which subtitle to highlight.
	 * The timecode shows in the little box in small text.
	 * The highlight thing, it's the one that is zoomed to. So whatever gets zoomed to, should also be highlighted.
	 * So anywhere scrollToClosestSubtitle is called, I want to also highlightSegment.
	 * So scrollToClosestSubtitle uses timePos.
	 */

	export function highlightSegment(timecode: string) {
		/*
		 * Note that timecodes are a subtitle thing, timestamps are a player position thing.
		 */
		console.log('HIGHLIGHTING: ', timecode);
		// TODO: Turn timecode into timestamp

		const timecodeAsSeconds = parseTimecodeToSeconds(timecode);

		// why did i need that? i know i need it, but why?

		// Remove highlight from previous element
		if (currentHighlightedElement) {
			currentHighlightedElement.classList.remove('highlighted');
		}

		// Add highlight to new element
		const element = segmentElements.get(timecode);
		if (element) {
			element.classList.add('highlighted');
			currentHighlightedElement = element;
			currentHighlightedTimecode = timecode;
		}
	}

	/*
	 * The question of scrolling to a position:
	 // I have: time position from stream.
	 // I have: list of subtitle start times.
	 // I have: corresponding heights for subtitle start
	 *
	 // I want: viewport at position of related subtitle
	 *
	 */
	const subtitleStartTimes: number[] = []; // sorted
	const subtitleHeights = new Map<number, number>();

	/**
	 * The question of highlighting a subtitle:
	 * The subtitle file has only these timecode things.
	 *
	 */

	// scrollToLocation(heightForSub);
	let mountedSegments = new Set<number>(); // track which segments have reported their position
	let allSegmentsMounted = false;

	function storeSegmentPosition(timecode: string, y: number, element: HTMLDivElement) {
		/* Used to transmit a component's Y height into the holder arr.
		 */

		const timecodeAsSeconds = parseTimecodeToSeconds(timecode);
		timePositionsToTimecodes.set(timecodeAsSeconds, timecode);

		mountedSegments.add(timecodeAsSeconds);
		subtitleHeights.set(timecodeAsSeconds, y);
		subtitleStartTimes.push(timecodeAsSeconds);

		segmentElements.set(timecode, element);

		// Check if all segments have mounted
		if (mountedSegments.size === data.segments.length) {
			allSegmentsMounted = true;
			console.log('All segments mounted, positions ready');
		}
	}

	/**
	 *
	 * My section
	 */

	// export function devtoolsScroller(timestamp: number) {
	export function devtoolsScroller(timePos: number) {
		const timecode = timePositionsToTimecodes.get(timePos);
		if (timecode) {
			highlightSegment(timecode);
		} else {
			console.log(timecode, 'not found');
		}
		scrollToClosestSubtitle(timePos, subtitleStartTimes, subtitleHeights, scrollContainer);
	}

	let content = '';
	let timePos = 0;
	let formattedTime = '';

	let lastScrollTime = 0;

	// TODO: Color the subtitle in question

	const database = new SubtitleDatabase();

	onMount(() => {
		// Use the pre-built arrays from server
		data.subtitleTimestamps.forEach((timestamp, index) => {
			subtitleStartTimes.push(timestamp);
			timePositionsToTimecodes.set(timestamp, data.timecodeMap[timestamp]);
		});

		// Rest of your onMount logic...
	});

	onMount(() => {
		(window as any).devtoolsScroller = devtoolsScroller;

		console.log('Window object:', window);
		console.log('electronAPI available:', !!window.electronAPI);

		if (window.electronAPI) {
			console.log('Running onMPVstate');
			window.electronAPI.onMPVState((data) => {
				// content :  "⏱️  0:13.6 / 22:35.7 (1.0%)"
				// formatted_duration :  "22:35.7"
				// formatted_time :  "0:13.6"
				// progress :  1
				// time_pos :  13.555
				// timestamp :  1753652691.9598007
				// type :  "time_update"
				content = data.content;
				timePos = data.time_pos;
				formattedTime = data.formatted_time;

				// Auto-scroll to current position (throttled)
				const now = Date.now();
				if (now - lastScrollTime > 500) {
					// Throttle to every 500ms
					const corresponding: number = findCorrespondingSubtitleTime(timePos, subtitleStartTimes);
					const timecode = timePositionsToTimecodes.get(corresponding);
					if (timecode) {
						highlightSegment(timecode);
					} else {
						console.log(timecode, 'not found');
					}
					scrollToClosestSubtitle(timePos, subtitleStartTimes, subtitleHeights, scrollContainer);

					lastScrollTime = now;
				}
			});
		} else {
			console.error('electronAPI not available');
		}

		// Initial scroll after mount
		setTimeout(() => {
			console.log(allSegmentsMounted, '104ru');

			console.log('SIZE: ', mountedSegments.size, '115ru');
			console.log(subtitleStartTimes.slice(-3), 'final 3 values 115ru');
			console.log(timePositionsToTimecodes.size, mountedSegments.size, '++ 172ru');

			const entries = Array.from(timePositionsToTimecodes.entries());
			console.log('First 3:', entries.slice(0, 3));
			console.log('Last 3:', entries.slice(-3));
			if (allSegmentsMounted) {
				const corresponding: number = findCorrespondingSubtitleTime(timePos, subtitleStartTimes);
				const timecode = timePositionsToTimecodes.get(corresponding);
				if (timecode) {
					highlightSegment(timecode);
				} else {
					console.log(timecode, 'not found');
				}
				scrollToClosestSubtitle(timePos, subtitleStartTimes, subtitleHeights, scrollContainer);
			}
		}, 150);
	});
</script>

<div class="container">
	<div class="subtitle-panel">
		<div class="subtitle-header">Subtitles</div>
		<div class="subtitle-content" bind:this={scrollContainer}>
			{#if data.segments.length > 0}
				{#each data.segments as segment}
					<SubtitleSegment
						timecode={segment.timecode}
						text={segment.text}
						emitTopOfContainer={storeSegmentPosition}
					/>
				{/each}
			{:else}
				<div class="loading">No subtitles found</div>
			{/if}
		</div>
	</div>
	<CardBuilder />
</div>

<style>
	.container {
		display: flex;
		height: 100vh;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.subtitle-panel {
		width: 400px;
		background: #2a2a2a;
		display: flex;
		flex-direction: column;
		color: white;
	}

	.subtitle-header {
		padding: 15px 20px;
		background: #333;
		border-bottom: 1px solid #444;
		font-weight: 600;
	}

	.subtitle-content {
		flex: 1;
		overflow-y: auto;
		padding: 10px;
	}

	.loading {
		color: #888;
		text-align: center;
		padding: 50px 20px;
	}

	.subtitle-content::-webkit-scrollbar {
		width: 8px;
	}

	.subtitle-content::-webkit-scrollbar-track {
		background: #1a1a1a;
	}

	.subtitle-content::-webkit-scrollbar-thumb {
		background: #555;
		border-radius: 4px;
	}

	.subtitle-content::-webkit-scrollbar-thumb:hover {
		background: #666;
	}
</style>
