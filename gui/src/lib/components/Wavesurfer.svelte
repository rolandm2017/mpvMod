<script lang="ts">
    import { onMount, onDestroy } from "svelte"; //
    import WaveSurfer from "wavesurfer.js";
    import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
    import type { Region } from "wavesurfer.js/dist/plugins/regions.js";

    import { MP3PlayerState } from "$lib/utils/mp3PlayerState";

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

    // TODO: Maybe a tickbox to let user prevent accidentally moving the boundaries?
    // FIXME: The first time the page loads, you must click Play Audio twice to make it play

    // TODO: 1. Get the duration of the clip showing. How long is the full clip, un-cut, outside of the little boundary box?
    // TODO: 2. Display the start, end of the bounding box. the Regions markers

    // TODO: 3. User clicks "Make card," the mp3 is snipped.

    let container: HTMLDivElement;
    let wavesurfer: WaveSurfer | null = null;
    let regionDisplay: Region | null = null;

    // mp3 is a dataUrl formed in the Electron main.js
    const { mp3, onPlayEvent = null, onPauseEvent = null } = $props();

    let currentAudioFile: HTMLAudioElement | null = $state(null);

    let fullFileEndTime = $state(0);
    let fullFileEndTimeDisplayString = $state("");

    let stateTracker = $state<MP3PlayerState | null>(null);
    // Derived from stateTracker
    let reactivityTrigger = $state(0);
    let currentState = $derived(
        (() => {
            reactivityTrigger; // Access the trigger to create dependency
            return stateTracker ? stateTracker.getState() : null;
        })()
    );
    let isPlaying = $derived(currentState?.main.isPlaying ?? false);
    let isRegionPlaying = $derived(currentState?.region.isPlaying ?? false);

    let cursorPosition = $state(0); // for the cursor string

    let regionStart = $state(5);
    let regionEnd = $state(8);

    // Case: Region is playing, usre clicks "play main". Result: REgion is paused, ticker goes to start
    // Case: Region is paused, user clicks "play main". result: region still paused, ticket goes tos tart
    // Case: Main is playing, User clicks "Play region". Main is paused, Region plays from start
    // Case: Main is paused, user clicks "Play region". Main is still paused, region plays from start.

    onMount(() => {
        const regionsPlugin = RegionsPlugin.create() as any;

        wavesurfer = WaveSurfer.create({
            container,
            waveColor: "#999",
            progressColor: "#555",
            height: 80, // 100 was too much real estate
            plugins: [regionsPlugin]
        });

        // Track play/pause events
        wavesurfer.on("play", () => {
            if (wavesurfer && stateTracker) {
                console.log("▶️ play event: ");
                console.log("Current time:", wavesurfer.getCurrentTime());
                const playEventTime = wavesurfer.getCurrentTime();
                stateTracker.acknowledgeEvent(playEventTime);
                onPlayEvent?.(playEventTime); // Report to test
            } else {
                throw new Error("Impossible to get here error");
            }
        });

        wavesurfer.on("pause", () => {
            if (wavesurfer && stateTracker) {
                console.log("Pausing: ");
                console.log("Current time:", wavesurfer.getCurrentTime());
                const pauseEventTime = wavesurfer.getCurrentTime();
                stateTracker.acknowledgeEvent(pauseEventTime);
                onPauseEvent?.(wavesurfer.getCurrentTime()); // Report to test
            } else {
                throw new Error("Impossible to get here error");
            }
        });

        wavesurfer.on("finish", () => {
            stateTracker?.handleEnded();
        });

        // Add regions after initialization
        wavesurfer.on("ready", () => {
            regionsPlugin.clearRegions();
            stateTracker?.setRegion(regionStart, regionEnd);
            regionDisplay = regionsPlugin.addRegion({
                start: regionStart,
                end: regionEnd,
                color: "rgba(0, 0, 255, 0.1)"
            });
            regionsPlugin.enableDragSelection();
        });

        wavesurfer.on("timeupdate", () => {
            if (stateTracker && wavesurfer) {
                const currentTime = wavesurfer.getCurrentTime();
                cursorPosition = currentTime;
                const wasRegionPlaying = stateTracker.getState().region.isPlaying;

                stateTracker.handleTimeUpdate(currentTime);

                // Check if region stopped playing due to reaching end
                const isRegionPlayingNow = stateTracker.getState().region.isPlaying;
                const playbackReachedEndOfRegion = wasRegionPlaying && !isRegionPlayingNow;
                if (playbackReachedEndOfRegion) {
                    // to update the Play/Pause btns
                    reactivityTrigger++; // Trigger Svelte reactivity
                }
            }
        });

        wavesurfer.on("click", (relativeX) => {
            if (wavesurfer && stateTracker) {
                const clickedTime = relativeX * fullFileEndTime;
                // Is clickedtime inside region or outside?
                // if inside region, set both there.
                // if outside region, only main time.
                stateTracker.handleUserClick(clickedTime);
            }
        });

        return () => {
            wavesurfer?.destroy();
        };
    });

    function resetRegionForNewClip(endTime: number) {
        // reset the cursor to 0:00
        cursorPosition = 0;

        // set the region start to 1/3
        const startPosition = endTime * 0.3333;
        regionStart = startPosition;
        // set the region end to 1/3
        const endPosition = endTime * 0.6666;
        regionEnd = endPosition;

        updateRegion(startPosition, endPosition);
        // reset region cursor to start
        canNudgeStartBackwards = true;
        // does needed?

        // reset brace start, end
        canNudgeEndBraceForwards = true;
    }

    let previousMp3 = $state(null);

    $effect(() => {
        if (mp3 && mp3 !== previousMp3) {
            if (currentAudioFile) {
                // cleanup old one
                currentAudioFile.src = "";
                currentAudioFile = null;
            }
            currentAudioFile = new Audio(mp3);

            currentAudioFile.addEventListener("loadedmetadata", () => {
                if (!wavesurfer) throw new Error("Surfer was null in $effect");
                if (!currentAudioFile) throw new Error("Somehow currentAudioFile is null");
                const audioDurationInSec = currentAudioFile.duration;
                stateTracker = new MP3PlayerState(audioDurationInSec, wavesurfer);
                fullFileEndTime = audioDurationInSec;
                fullFileEndTimeDisplayString = convertToTimeString(audioDurationInSec);
                if (previousMp3 === null) {
                    // use default region for first clip
                    return;
                }
                resetRegionForNewClip(audioDurationInSec);
            });

            previousMp3 = mp3;
        }
    });

    function convertToTimeString(duration: number) {
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }

    function msTimeString(duration: number) {
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        const milliseconds = Math.floor((duration % 1) * 10);
        return `${minutes}:${seconds.toString().padStart(2, "0")}.${milliseconds}`;
    }

    function doubleDecimalTimeString(duration: number) {
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        const milliseconds = Math.floor((duration % 1) * 100);
        return `${minutes}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`;
    }

    $effect(() => {
        if (wavesurfer && mp3) {
            wavesurfer.load(mp3);
        } else {
            // console.log(wavesurfer, mp3.slice(0, 40), "Nothing");
        }
    });

    function togglePlayPause() {
        if (!stateTracker) throw new Error("Null state tracker");
        if (stateTracker.getState().main.isPlaying) {
            stateTracker.pauseMain();
        } else {
            stateTracker.playMain();
        }
        // Trigger reactivity
        reactivityTrigger++;
    }

    // FIXME: Shift boundary right btn click, then play Region, Region autostops at prev. end of region.

    function playPauseInRegion() {
        if (!stateTracker) throw new Error("Null state tracker");
        if (stateTracker.getState().region.isPlaying) {
            stateTracker.pauseRegion();
        } else {
            stateTracker.playRegion();
        }
        // Trigger reactivity
        reactivityTrigger++;
    }

    let canNudgeStartBackwards = $state(true);
    let canNudgeEndBraceForwards = $state(true);

    function nudgeStart(direction: number) {
        const resultOfUpdate = regionStart + direction;
        // TODO: Handle case where yields negative duration
        if (resultOfUpdate <= 0) {
            regionStart = 0;
            updateRegion(0, regionEnd);
            // grey out nudge back until user nudges fwdd
            canNudgeStartBackwards = false;
        } else {
            regionStart = resultOfUpdate;

            updateRegion(resultOfUpdate, regionEnd);
            canNudgeStartBackwards = true;

            const yieldsNegativeDuration = regionEnd < resultOfUpdate;
            if (yieldsNegativeDuration) {
                regionEnd = resultOfUpdate + 0.3;
            }
        }
        stateTracker?.setRegion(regionStart, regionEnd); // ADD THIS
    }

    function nudgeEnd(direction: number) {
        console.log("Nudge End: ", direction);
        // to nudge earlier, call w/ a negative number
        const endResult = regionEnd + direction;
        const yieldsNegativeDuration = endResult <= regionStart;
        if (yieldsNegativeDuration) {
            regionEnd = endResult;
            regionStart = endResult - 0.2;
            updateRegion(endResult - 0.2, endResult);
            return;
        }
        if (endResult >= fullFileEndTime) {
            regionEnd = fullFileEndTime;
            canNudgeEndBraceForwards = false;
        } else {
            regionEnd += direction;
            console.log("HERE ", direction, regionStart, regionEnd);
            updateRegion(regionStart, regionEnd);
            canNudgeEndBraceForwards = true;
        }
    }

    function updateRegion(newStart: number, newEnd: number) {
        if (regionDisplay && stateTracker) {
            // TODO: Update the Mp3 state tracker
            console.log("calling setRegion", newStart, newEnd);
            stateTracker.setRegion(newStart, newEnd);
            regionDisplay.setOptions({
                start: newStart,
                end: newEnd
            });
        }
    }
</script>

<div bind:this={container} class="w-full"></div>

<!-- // TODO: Nudge by sec, 1/4 sec. Allow user to pick values -->
<div class="push-items-right time-container">
    <div class="time-half-start">
        <span>Cursor: {doubleDecimalTimeString(cursorPosition)}</span>
    </div>
    <div class="time-half-end">
        <span>Length: {convertToTimeString(fullFileEndTime)}</span>
    </div>
</div>
<div class="time-row flex-row push-items-top sml-space-below">
    <div class="time-group half-container-fill">
        <div class="adjust-label-container center-container">
            <h4 class="push-items-top">Start Time</h4>
        </div>
        <div class="time-display">
            <button class="nudge-btn" class:disabled-text={!canNudgeStartBackwards} onclick={() => nudgeStart(-0.5)}
                >←</button
            >
            <span class="time-value">{msTimeString(regionStart)}</span>
            <!-- // TODO: disable if nudge fwd puts it ahead of end brace -->
            <button class="nudge-btn" onclick={() => nudgeStart(0.5)}>→</button>
        </div>
    </div>

    <div class="time-group half-container-fill">
        <div class="adjust-label-container center-container">
            <h4 class="push-items-top">End Time</h4>
        </div>
        <div class="time-display">
            <button class="nudge-btn" onclick={() => nudgeEnd(-0.5)}>←</button>
            <span class="time-value">{msTimeString(regionEnd)}</span>
            <button class="nudge-btn" class:disabled-text={!canNudgeEndBraceForwards} onclick={() => nudgeEnd(0.5)}
                >→</button
            >
        </div>
    </div>
</div>

<!-- // TODO: separate these play btns , if region playing, only region changes, -->
<!-- // if main plays, only main changes, Region deosn't change -->
<div>
    <button class="play-btn sml-space-below" onclick={togglePlayPause}>
        {isPlaying ? "⏸️ Pause" : "▶️ Play Audio"}
    </button>
    <button class="play-btn sml-space-below" onclick={playPauseInRegion}>
        {isRegionPlaying ? "⏸️ Pause" : "▶️ Play Region"}
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

    .time-container {
        display: flex;
        width: 100%;
    }

    .time-half-start {
        width: 50%;
        display: flex;
        justify-content: flex-start;
    }

    .time-half-end {
        width: 50%;
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
        margin-right: 8px;
        padding: 8px 20px;
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

    .disabled-text {
        color: #999;
    }
</style>
