<script lang="ts">
    import { MP3PlayerState } from '$lib/utils/mp3PlayerState';
    import { onMount, onDestroy } from 'svelte'; //
    import WaveSurfer from 'wavesurfer.js';
    import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
    import type { Region } from 'wavesurfer.js/dist/plugins/regions.js';

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
    let regionDisplay: Region | null = null;

    // mp3 is a dataUrl formed in the Electron main.js
    const { mp3 } = $props();

    let currentAudioFile: HTMLAudioElement | null = $state(null);

    // Track playing state
    let isPlaying = $state(false);
    let playbackPosition = $state(0);

    let stateTracker: MP3PlayerState | null = $state(null);

    // let fullFileStartTime = $state('0:00');
    // let fullFileEndTime = $state('0:00');
    let fullFileStartTime = $state(0);
    let fullFileEndTime = $state(0);

    let fullFileEndTimeDisplayString = $state('');

    let regionStart = $state(5);
    let regionEnd = $state(7);

    // Case: Region is playing, usre clicks "play main". Result: REgion is paused, ticker goes to start
    // Case: Region is paused, user clicks "play main". result: region still paused, ticket goes tos tart
    // Case: Main is playing, User clicks "Play region". Main is paused, Region plays from start
    // Case: Main is paused, user clicks "Play region". Main is still paused, region plays from start.

    onMount(() => {
        console.log(mp3.slice(0, 30), 'mp3 mp3 227ru');

        const regionsPlugin = RegionsPlugin.create() as any;

        wavesurfer = WaveSurfer.create({
            container,
            waveColor: '#999',
            progressColor: '#555',
            height: 100,
            plugins: [regionsPlugin]
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
            stateTracker?.handleEnded();
        });

        // Add regions after initialization
        wavesurfer.on('ready', () => {
            regionDisplay = regionsPlugin.addRegion({
                start: regionStart,
                end: regionEnd,
                color: 'rgba(0, 0, 255, 0.1)'
            });
            regionsPlugin.enableDragSelection();
        });

        return () => {
            wavesurfer?.destroy();
        };
    });

    function updateRegion(newStart: number, newEnd: number) {
        if (regionDisplay) {
            regionDisplay.setOptions({
                start: newStart,
                end: newEnd
            });
        }
    }

    //d fsdfds
    let previousMp3 = $state(null);

    $effect(() => {
        if (mp3 && mp3 !== previousMp3) {
            if (currentAudioFile) {
                // cleanup old one
                currentAudioFile.src = '';
                currentAudioFile = null;
            }
            // TODO: How does this effect know to fire when "Mp3" becoems a new MP3?
            console.log(mp3.slice(0, 30), '89ru');
            currentAudioFile = new Audio(mp3);
            // TODO: How does the mp3 player get ahold of the new audio file?

            currentAudioFile.addEventListener('loadedmetadata', () => {
                if (!wavesurfer) throw new Error('Surfer was null in $effect');
                if (!currentAudioFile) throw new Error('Somehow currentAudioFile is null');
                const audioDurationInSec = currentAudioFile.duration;
                stateTracker = new MP3PlayerState(audioDurationInSec, wavesurfer);
                console.log(audioDurationInSec, '95ru');
                fullFileEndTime = audioDurationInSec;
                fullFileEndTimeDisplayString = convertToTimeString(audioDurationInSec);
            });

            previousMp3 = mp3;
        }
    });

    function convertToTimeString(duration: number) {
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        console.log(duration, minutes, seconds, '104ru');
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    $effect(() => {
        // FIXME: Does this work? when mp3 changes from first_mp3.mp3 to second_mp3.mpe, does it update?
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
            const startFrom = playbackPosition > regionStart ? playbackPosition : regionStart;
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
                    if (!wavesurfer) throw new Error('Wavesurfer was null in checkTime');
                    if (!stateTracker) throw new Error('Null state tracker');
                    playbackPosition = wavesurfer.getCurrentTime(); // Update position continuously
                    stateTracker.handleTimeUpdate(playbackPosition);
                    requestAnimationFrame(checkTime);
                }
            };

            if (regionEnd > regionStart) {
                requestAnimationFrame(checkTime);
            }
        }
    }

    let regionPosition = $state(0); // Position within the region (0 = region start)
    let isRegionPlaying = $state(false); // Separate state for region playback

    function resetRegionPlayback() {
        regionPosition = 0;
    }

    function playPauseInRegion() {
        if (!wavesurfer) return;

        const markerIsAtEndOfRegion = regionPosition === regionEnd - regionStart;
        console.log(regionPosition, regionEnd, markerIsAtEndOfRegion, '175ru');
        if (markerIsAtEndOfRegion) {
            // reset
            resetRegionPlayback();
        }

        if (isRegionPlaying) {
            // Pause and store current position within region
            const currentTime = wavesurfer.getCurrentTime();
            regionPosition = currentTime - regionStart; // Store offset from region start

            wavesurfer.pause();
            isRegionPlaying = false;
        } else {
            // Play from stored region position
            const actualPosition = regionStart + regionPosition;
            wavesurfer.seekTo(actualPosition / fullFileEndTime);
            wavesurfer.play();
            isRegionPlaying = true;

            // Monitor playback within region bounds
            const checkTime = () => {
                if (!isRegionPlaying) return; // Stop monitoring if paused
                if (!wavesurfer) throw new Error('Wavesurfer was null in checkTime');
                if (!stateTracker) throw new Error('Null state tracker');

                const currentTime = wavesurfer.getCurrentTime();

                if (currentTime >= regionEnd) {
                    wavesurfer.pause();
                    regionPosition = regionEnd - regionStart; // At end of region
                    isRegionPlaying = false;
                } else {
                    regionPosition = currentTime - regionStart; // Update region position
                    stateTracker.handleTimeUpdate(regionPosition);
                    requestAnimationFrame(checkTime);
                }
            };

            requestAnimationFrame(checkTime);
        }
    }

    function nudgeStart(direction: number) {
        console.log('Nudge Start: ', direction);
        // to nudge earlier, call w/ a negative number
        const endResult = regionStart + direction;
        const yieldsNegativeDuration = endResult >= regionEnd;
        if (yieldsNegativeDuration) {
            return;
        }
        regionStart += direction;
        updateRegion(regionStart, regionEnd);
    }

    function nudgeEnd(direction: number) {
        console.log('Nudge End: ', direction);
        // to nudge earlier, call w/ a negative number
        const endResult = regionEnd + direction;
        const yieldsNegativeDuration = endResult <= regionStart;
        if (yieldsNegativeDuration) {
            return;
        }
        regionEnd += direction;
        updateRegion(regionStart, regionEnd);
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

<!-- // TODO: separate these play btns , if region playing, only region changes, -->
<!-- // if main plays, only main changes, Region deosn't change -->
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
