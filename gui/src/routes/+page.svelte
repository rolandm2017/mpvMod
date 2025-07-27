<script lang="ts">
	import CardBuilder from '$lib/CardBuilder.svelte';
	import SubtitleSegment from '$lib/SubtitleSegment.svelte';
	import { onMount, onDestroy } from 'svelte';

	export let data;

	let scrollContainer: HTMLDivElement;

	// Form state
	let videoUrl = '';
	let startTime = '';
	let endTime = '';
	let selectedLanguage = 'en';
	let exportFormat = 'srt';
	let searchQuery = '';

	onMount(() => {
		scrollContainer.scrollTo({
			top: 29563.78125,
			behavior: 'auto' // "auto", or "smooth"
		});
	});

	// TODO: I can, like, predict when the subtitle will change again, because
	// if the previous timestamp update said time 304, and the subtitle changes at time 307, three sec later,
	// the subtitle must change

	function storeTopOfContainer(y: number) {
		//
	}

	function getSubtitleScrollPosition() {
		//
	}

	function scrollToPosition() {
		//
	}

	let content = '';
	let timePos = 0;
	let formattedTime = '';

	onMount(() => {
		// Direct variable updates - fastest possible
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
			});
		} else {
			console.error('electronAPI not available');
		}
	});

	// Position tracking
	let segmentPositions = new Map<string, number>(); // timecode -> y position
	let mountedSegments = new Set<string>(); // track which segments have reported their position
	let allSegmentsMounted = false;

	function storeSegmentPosition(timecode: string, y: number) {
		segmentPositions.set(timecode, y);
		mountedSegments.add(timecode);

		// Check if all segments have mounted
		if (mountedSegments.size === data.segments.length) {
			allSegmentsMounted = true;
			console.log('All segments mounted, positions ready');
		}
	}

	function scrollToTimecode(targetTimecode: string) {
		const position = segmentPositions.get(targetTimecode);
		if (position !== undefined) {
			// Adjust for container's scroll offset
			const containerRect = scrollContainer.getBoundingClientRect();
			const scrollTop = position - containerRect.top + scrollContainer.scrollTop;

			scrollContainer.scrollTo({
				top: scrollTop,
				behavior: 'smooth'
			});
		} else {
			console.warn(`Position not found for timecode: ${targetTimecode}`);
		}
	}

	// Function to find closest timecode if exact match not found
	function scrollToClosestTimecode(
		targetTime: number,
		mode: 'closest' | 'previous' | 'next' = 'closest'
	) {
		if (!allSegmentsMounted) {
			console.warn('Not all segments mounted yet');
			return;
		}

		let bestTimecode = '';
		let bestDiff = Infinity;

		for (const segment of data.segments) {
			const segmentTime = parseTimecodeToSeconds(segment.timecode);

			if (mode === 'previous') {
				// Find the latest subtitle that starts before or at targetTime
				if (segmentTime <= targetTime) {
					const diff = targetTime - segmentTime;
					if (diff < bestDiff) {
						bestDiff = diff;
						bestTimecode = segment.timecode;
					}
				}
			} else if (mode === 'next') {
				// Find the earliest subtitle that starts after targetTime
				if (segmentTime > targetTime) {
					const diff = segmentTime - targetTime;
					if (diff < bestDiff) {
						bestDiff = diff;
						bestTimecode = segment.timecode;
					}
				}
			} else {
				// Closest (default behavior)
				const diff = Math.abs(segmentTime - targetTime);
				if (diff < bestDiff) {
					bestDiff = diff;
					bestTimecode = segment.timecode;
				}
			}
		}

		if (bestTimecode) {
			scrollToTimecode(bestTimecode);
		}
	}

	function parseTimecodeToSeconds(timecode: string): number {
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
</script>

<div class="container">
	<div class="subtitle-panel">
		<div class="subtitle-header">Subtitles</div>
		<div class="subtitle-content" bind:this={scrollContainer}>
			<!-- make a float value, time in seconds,use with time_pos -->
			{#if data.segments.length > 0}
				{#each data.segments as segment}
					<SubtitleSegment
						timecode={segment.timecode}
						text={segment.text}
						emitTopOfContainer={storeTopOfContainer}
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
