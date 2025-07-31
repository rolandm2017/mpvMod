<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import WaveSurfer from 'wavesurfer.js';
    import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';

    let container: HTMLDivElement;
    let wavesurfer: WaveSurfer | null = null;

    // mp3 is a dataUrl formed in the Electron main.js
    const { mp3 } = $props();

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
        console.log(mp3, 'mp3 mp3 227ru');
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

    $effect(() => {
        if (wavesurfer && mp3) {
            console.log('Loading mp3: ', mp3);
            wavesurfer.load(mp3);
        } else {
            console.log(wavesurfer, mp3, 'Nothing');
        }
    });

    let startTime = $state('8:06');
    let endTime = $state('8:13');

    function nudgeStart(direction: number) {
        let [minutes, seconds] = startTime.split(':').map(Number);
        let totalSeconds = minutes * 60 + seconds;
        totalSeconds += direction;

        if (totalSeconds < 0) totalSeconds = 0;

        let newMinutes = Math.floor(totalSeconds / 60);
        let newSeconds = totalSeconds % 60;
        startTime = `${newMinutes}:${newSeconds.toString().padStart(2, '0')}`;
    }

    function nudgeEnd(direction: number) {
        let [minutes, seconds] = endTime.split(':').map(Number);
        let totalSeconds = minutes * 60 + seconds;
        totalSeconds += direction;

        if (totalSeconds < 0) totalSeconds = 0;

        let newMinutes = Math.floor(totalSeconds / 60);
        let newSeconds = totalSeconds % 60;
        endTime = `${newMinutes}:${newSeconds.toString().padStart(2, '0')}`;
    }

    function playAudio() {
        console.log(`Playing audio from ${startTime} to ${endTime}`);
        // Add your audio playback logic here
    }
</script>

<div bind:this={container} class="w-full"></div>
<div class="time-row flex-row push-items-top sml-space-below">
    <div class="time-group half-container-fill">
        <h4 class="push-items-top">Start Time</h4>
        <div class="time-display">
            <button class="nudge-btn" onclick={() => nudgeStart(-1)}>←</button>
            <span class="time-value">{startTime}</span>
            <button class="nudge-btn" onclick={() => nudgeStart(-1)}>→</button>
        </div>
    </div>

    <div class="time-group half-container-fill">
        <h4 class="push-items-top">End Time</h4>
        <div class="time-display">
            <button class="nudge-btn" onclick={() => nudgeEnd(-1)}>←</button>
            <span class="time-value">{endTime}</span>
            <button class="nudge-btn" onclick={() => nudgeEnd(1)}>→</button>
        </div>
    </div>
</div>

<button class="play-btn sml-space-below" onclick={playAudio}
    >▶ Play Audio</button
>

<style>
    h4 {
        font-weight: 400;
    }
    .half-container-fill {
        width: 50%;
    }

    .push-items-top {
        margin-top: 0;
    }

    .sml-space-below {
        margin-bottom: 10px;
    }

    .time-display .nudge-btn {
        width: 50px;
        min-width: 50px;
        background-color: #dddddd;
        box-shadow:
            0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
</style>
