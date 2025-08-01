<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import WaveSurfer from 'wavesurfer.js';
    import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';

    /**
     * 1. Avoid re-initializing wavesurfer on every prop change
     * "Don't re-run your WaveSurfer setup logic (WaveSurfer.create(...)) every time a Svelte prop or state variable changes."
     * Why? ⚡ WaveSurfer.create(...) is expensive.⚡
     * - It will destroy and recreate the waveform canvas and plugins
     * - It breaks the UI (waveform flashes, playback state lost)
     * - It causes performance drops and visual jank
     *
     *  2. For large files, use .load(blob) instead of URL streaming.
     *      - "Reduces latency compared to fetching from remote URLs"
     *
     * 3. Use Svelte's $: reactivity sparingly — don't tie it to waveform rendering
     */

    // TODO: 1. Get the duration of the clip showing. How long is the full clip, un-cut, outside of the little boundary box?
    // TODO: 2. Display the start, end of the bounding box. the Regions markers
    // TODO: 3. User clicks "Make card," the mp3 is snipped.
    // TODO: Maybe a tickbox to let user prevent accidentally moving the boundaries?
    // TODO: 4. Let user click btn to play the Regions area.
    // FIXME: The first time the page loads, you must click Play Audio twice to make it play

    let container: HTMLDivElement;
    let wavesurfer: WaveSurfer | null = null;

    // mp3 is a dataUrl formed in the Electron main.js
    const { mp3 } = $props();

    let currentAudioFile: HTMLAudioElement | null = $state(null);

    // Track playing state
    let isPlaying = $state(false);
    let playbackPosition = $state(0);

    // let fullFileStartTime = $state('0:00');
    // let fullFileEndTime = $state('0:00');
    let fullFileStartTime = $state(0);
    let fullFileEndTime = $state(0);

    let fullFileEndTimeDisplayString = $state('');

    let regionStart = $state(5);
    let regionEnd = $state(10);

    onMount(() => {
        console.log(mp3.slice(0, 30), 'mp3 mp3 227ru');

        const regionsPlugin = RegionsPlugin.create() as any;

        wavesurfer = WaveSurfer.create({
            container,
            waveColor: '#999',
            progressColor: '#555',
            height: 100,
            plugins: [regionsPlugin],
        });

        // Track play/pause events
        wavesurfer.on('play', () => {
            isPlaying = true;
        });

        wavesurfer.on('pause', () => {
            isPlaying = false;
        });

        wavesurfer.on('finish', () => {
            isPlaying = false;
        });

        // Add regions after initialization
        wavesurfer.on('ready', () => {
            regionsPlugin.addRegion({
                start: regionStart,
                end: regionEnd,
                color: 'rgba(0, 0, 255, 0.1)',
            });
            regionsPlugin.enableDragSelection();
        });

        return () => {
            wavesurfer?.destroy();
        };
    });

    $effect(() => {
        if (mp3 && currentAudioFile === null) {
            console.log(mp3.slice(0, 30), '89ru');
            currentAudioFile = new Audio(mp3);

            currentAudioFile.addEventListener('loadedmetadata', () => {
                if (!currentAudioFile)
                    throw new Error('Somehow currentAudioFile is null');
                const audioDurationInSec = currentAudioFile.duration;
                console.log(audioDurationInSec, '95ru');
                fullFileEndTime = audioDurationInSec;
                fullFileEndTimeDisplayString =
                    convertToTimeString(audioDurationInSec);
            });
        }
    });

    function convertToTimeString(duration: number) {
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        console.log(duration, minutes, seconds, '104ru');
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    $effect(() => {
        if (wavesurfer && mp3) {
            console.log('Loading mp3 : ', mp3.slice(0, 40));
            wavesurfer.load(mp3);
        } else {
            console.log(wavesurfer, mp3.slice(0, 40), 'Nothing');
        }
    });

    function togglePlayPause() {
        console.log(!wavesurfer, isPlaying, '107ru');
        if (!wavesurfer) return;

        if (isPlaying) {
            playbackPosition = wavesurfer.getCurrentTime();
            wavesurfer.pause();
        } else {
            // Resume from stored position (or region start if at beginning)
            const startFrom =
                playbackPosition > regionStart ? playbackPosition : regionStart;
            wavesurfer.seekTo(startFrom / fullFileEndTime);
            wavesurfer.play();

            // Set up auto-stop at region end
            const checkTime = () => {
                // stop
                const timeExceedsEndOfClippingRegion =
                    wavesurfer && wavesurfer.getCurrentTime() >= regionEnd;
                if (wavesurfer && timeExceedsEndOfClippingRegion) {
                    wavesurfer.pause();
                    playbackPosition = regionEnd;
                } else if (isPlaying) {
                    if (!wavesurfer)
                        throw new Error('Wavesurfer was null in checkTime');
                    playbackPosition = wavesurfer.getCurrentTime(); // Update position continuously
                    requestAnimationFrame(checkTime);
                }
            };

            if (regionEnd > regionStart) {
                requestAnimationFrame(checkTime);
            }
        }
    }

    let regionPosition = $state(0);

    // TODO: Get the region times into state vars.
    // TODO: Then test playPause in Region

    function playPauseInRegion() {
        // FIXME: it's broken: the pause button restarts at start of region.
        // FIXME: it's broken: get to end of region, frozen, cant do anything
        if (!wavesurfer) return;

        // Calculate actual playback position (region start + offset)
        const playbackIsAtRegionEnd = playbackPosition === regionEnd;
        if (playbackIsAtRegionEnd) {
            // reset everything to start
            // playbackPosition = regionStart
            // wavesurfer.seekTo(playbackPosition/fullFileEndTime)
        }
        const actualPosition = regionStart + regionPosition;
        console.log(actualPosition, '169ru');

        // Seek to position and play
        wavesurfer.seekTo(actualPosition / fullFileEndTime);
        wavesurfer.play();

        // Monitor playback within region bounds
        const checkTime = () => {
            if (!wavesurfer)
                throw new Error('Wavesurfer was null in checkTime');
            const currentTime = wavesurfer.getCurrentTime();

            if (currentTime >= regionEnd) {
                wavesurfer.pause();
                regionPosition = regionEnd - regionStart; // At end of region
            } else if (isPlaying) {
                regionPosition = currentTime - regionStart; // Update region position
                requestAnimationFrame(checkTime);
            }
        };

        requestAnimationFrame(checkTime);
    }

    function nudgeStart(direction: number) {
        // let [minutes, seconds] = regionStart.split(':').map(Number);
        // let totalSeconds = minutes * 60 + seconds;
        // totalSeconds += direction;
        // if (totalSeconds < 0) totalSeconds = 0;
        // let newMinutes = Math.floor(totalSeconds / 60);
        // let newSeconds = totalSeconds % 60;
        // regionStart = `${newMinutes}:${newSeconds.toString().padStart(2, '0')}`;
    }

    function nudgeEnd(direction: number) {
        // let [minutes, seconds] = endTime.split(':').map(Number);
        // let totalSeconds = minutes * 60 + seconds;
        // totalSeconds += direction;
        // if (totalSeconds < 0) totalSeconds = 0;
        // let newMinutes = Math.floor(totalSeconds / 60);
        // let newSeconds = totalSeconds % 60;
        // endTime = `${newMinutes}:${newSeconds.toString().padStart(2, '0')}`;
    }

    // SO we're gonna:
    //      - store everything as seconds. 2 min -> 120 seconds. 2:05 -> 125 seconds
    //      - convert seconds -> mm:ss for display purposes
    //  - very few clips will exceed 30 seconds anyweays
    // TODO: Make the UI show the clipping region start, end
</script>

<div bind:this={container} class="w-full"></div>
<div class="push-items-right">
    <span>Length: {convertToTimeString(fullFileEndTime)}</span>
</div>
<div class="time-row flex-row push-items-top sml-space-below">
    <div class="time-group half-container-fill">
        <div class="adjust-label-container center-container">
            <h4 class="push-items-top">Start Time</h4>
        </div>
        <div class="time-display">
            <button class="nudge-btn" onclick={() => nudgeStart(-1)}>←</button>
            <span class="time-value">0:00</span>
            <button class="nudge-btn" onclick={() => nudgeStart(1)}>→</button>
        </div>
    </div>

    <div class="time-group half-container-fill">
        <div class="adjust-label-container center-container">
            <h4 class="push-items-top">End Time</h4>
        </div>
        <div class="time-display">
            <button class="nudge-btn" onclick={() => nudgeEnd(-1)}>←</button>
            <span class="time-value">{fullFileEndTimeDisplayString}</span>
            <button class="nudge-btn" onclick={() => nudgeEnd(1)}>→</button>
        </div>
    </div>
</div>

<div>
    <button class="play-btn sml-space-below" onclick={togglePlayPause}>
        {isPlaying ? '⏸️ Pause' : '▶️ Play Audio'}
    </button>
    <button class="play-btn sml-space-below" onclick={playPauseInRegion}>
        {isPlaying ? '⏸️ Pause' : '▶️ Play Region'}
    </button>
</div>

<style>
    h4 {
        font-weight: 400;
        margin: 16px 0px 4px 0px;
    }
    .adjust-label-container {
        height: 30px;
    }
    .center-container {
        display: flex;
        align-items: center;
    }
    .half-container-fill {
        width: 50%;
    }

    .push-items-top {
        margin-top: 0;
    }

    .push-items-right {
        display: flex;
        justify-content: flex-end;
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

    .play-btn {
        background-color: #4caf50;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
    }

    .play-btn:hover {
        background-color: #45a049;
    }

    .flex-row {
        display: flex;
    }
</style>
