<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	import CardBuilder from '$lib/CardBuilder.svelte';
	import SubtitleSegment from '$lib/SubtitleSegment.svelte';

	import {
		findCorrespondingSubtitleTime,
		scrollToClosestSubtitle
	} from '$lib/utils/subtitleScroll.js';

	export let data;

	let scrollContainer: HTMLDivElement;

	// onMount(() => {
	// 	scrollContainer.scrollTo({
	// 		top: 29563.78125,
	// 		behavior: 'auto' // "auto", or "smooth"
	// 	});
	// });

	// Position tracking
	// HAVE: time position from stream.
	// HAVE: list of subtitle start times.
	const subtitleStartTimes: number[] = []; // sorted
	// HAVE: corresponding heights for subtitle start
	const subtitleHeights = new Map<number, number>();

	// const current: number = findCurrentSubtitleTime(timePos, subtitleStartTimes);
	// const heightForSub = subtitleHeights.get(current) ?? 0;

	// // WANT: viewport at position of related subtitle

	// scrollToLocation(heightForSub);
	let mountedSegments = new Set<number>(); // track which segments have reported their position
	let allSegmentsMounted = false;

	function storeSegmentPosition(timecode: number, y: number) {
		/* Used to transmit a component's Y height into the holder arr.
		
		 */
		mountedSegments.add(timecode);
		subtitleHeights.set(timecode, y);

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

	export function devtoolsScroller(timestamp: number) {
		scrollToClosestSubtitle(timestamp, subtitleStartTimes, subtitleHeights, scrollContainer);
	}

	let content = '';
	let timePos = 0;
	let formattedTime = '';

	let lastScrollTime = 0;

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

					scrollToClosestSubtitle(timePos, subtitleStartTimes, subtitleHeights, scrollContainer);

					lastScrollTime = now;
				}
			});
		} else {
			console.error('electronAPI not available');
		}

		// Initial scroll after mount
		setTimeout(() => {
			if (allSegmentsMounted) {
				scrollToClosestSubtitle(timePos, subtitleStartTimes, subtitleHeights, scrollContainer);
			}
		}, 100);
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
