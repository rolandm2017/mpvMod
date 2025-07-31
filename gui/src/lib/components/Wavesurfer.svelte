<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import WaveSurfer from 'wavesurfer.js';
    import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';

    let container: HTMLDivElement;
    let wavesurfer: WaveSurfer | null = null;

    /**
     * 1. Avoid re-initializing wavesurfer on every prop change
     * "Don’t re-run your WaveSurfer setup logic (WaveSurfer.create(...)) every time a Svelte prop or state variable changes."
     * Why? ⚡ WaveSurfer.create(...) is expensive.⚡
     * - It will destroy and recreate the waveform canvas and plugins
     * - It breaks the UI (waveform flashes, playback state lost)
     * - It causes performance drops and visual jank
     *
     *  2. For large files, use .load(blob) instead of URL streaming.
     *      - "Reduces latency compared to fetching from remote URLs"
     *
     * 3. Use Svelte’s $: reactivity sparingly — don’t tie it to waveform rendering
     */

    onMount(() => {
        const init = async () => {
            // Can enable the below if you want to lazy load.
            // the cost is that user might see that part of the app loading.
            // const { default: WaveSurfer } = await import('wavesurfer.js');
            // const { default: RegionsPlugin } = await import(
            //     'wavesurfer.js/dist/plugins/regions.js'
            // );
        };

        const regionsPlugin = RegionsPlugin.create() as any;

        wavesurfer = WaveSurfer.create({
            container,
            waveColor: '#999',
            progressColor: '#555',
            height: 100,
            plugins: [regionsPlugin],
        });

        wavesurfer.load('/audio/sample.mp3');

        // Add regions after initialization
        wavesurfer.on('ready', () => {
            regionsPlugin.addRegion({
                start: 5,
                end: 10,
                color: 'rgba(0, 0, 255, 0.1)',
            });
            regionsPlugin.enableDragSelection();
        });

        return () => {
            wavesurfer?.destroy();
        };
    });
</script>

<div bind:this={container} class="w-full" />
