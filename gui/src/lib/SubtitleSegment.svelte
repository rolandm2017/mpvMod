<script lang="ts">
	import { onMount } from 'svelte';
	export let timecode;
	export let text;

	let el: HTMLDivElement;

	onMount(() => {
		const y = el.getBoundingClientRect().top;
		// console.log(`Segment ${timecode} top Y:`, y);
	});
</script>

<div class="subtitle-segment" bind:this={el}>
	<div class="subtitle-time">{timecode}</div>
	<div class="subtitle-text">{text}</div>
</div>

<style>
	.subtitle-segment {
		margin-bottom: 15px;
		padding: 12px 15px;
		background: #333;
		border-radius: 8px;
		border-left: 3px solid #555;
		transition: all 0.2s ease;
	}

	.subtitle-segment:hover {
		background: #3a3a3a;
		border-left-color: #007acc;
	}

	.subtitle-time {
		font-size: 11px;
		color: #888;
		margin-bottom: 5px;
		font-family: monospace;
	}

	.subtitle-text {
		line-height: 1.4;
		color: #e0e0e0;
	}
</style>
