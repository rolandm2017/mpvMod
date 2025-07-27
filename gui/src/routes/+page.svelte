<!-- <h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p> -->

<script lang="ts">
	import SubtitleSegment from '$lib/SubtitleSegment.svelte';
	import { onMount } from 'svelte';

	export let data;

	let scrollContainer: HTMLDivElement;

	onMount(() => {
		scrollContainer.scrollTo({
			top: 29563.78125,
			behavior: 'auto' // "auto", or "smooth"
		});
	});

	// TODO: I can, like, predict when the subtitle will change again, because
	// if the previous timestamp update said time 304, and the subtitle changes at time 307, three sec later,
	// the subtitle must change

	function getSubtitleScrollPosition() {
		//
	}

	function scrollToPosition() {
		//
	}
</script>

<div class="container">
	<div class="subtitle-panel">
		<div class="subtitle-header">Subtitles</div>
		<div class="subtitle-content" bind:this={scrollContainer}>
			{#if data.segments.length > 0}
				{#each data.segments as segment}
					<SubtitleSegment timecode={segment.timecode} text={segment.text} />
				{/each}
			{:else}
				<div class="loading">No subtitles found</div>
			{/if}
		</div>
	</div>
</div>

<style lang="ts">
	.container {
		display: flex;
		height: 100vh;
	}

	.subtitle-panel {
		width: 400px;
		background: #2a2a2a;
		display: flex;
		flex-direction: column;
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
