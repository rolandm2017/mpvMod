<!-- page.svelte, the main and only page -->
<script lang="ts">
    import { onMount, onDestroy, getContext } from "svelte";

    import CardBuilder from "$lib/CardBuilder.svelte";
    import SubtitleSegment from "$lib/SubtitleSegment.svelte";

    import { Finder, scrollToClosestSubtitle, scrollToLocation } from "$lib/utils/subtitleScroll.js";
    import { Subtitle, SubtitleDatabase } from "$lib/utils/subtitleDatabase.js";
    import type { PlayerPosition, TimecodeString } from "$lib/types.js";
    import { SegmentMountingTracker } from "$lib/utils/mountingTracker.js";
    import HotkeyConfig from "$lib/HotkeyConfig.svelte";
    import type { CommandResponse, HotkeyRegister, MPVStateData, ParsedSegmentObj } from "$lib/interfaces.js";
    import FieldMappingConfig from "$lib/FieldMappingConfig.svelte";
    import { parseSrtFileIntoSegments, prebuildLookupArrays } from "$lib/utils/parsing.js";

    let { data } = $props();

    //FIXME: src/routes/+page.svelte:20:8 `scrollContainer` is updated, but is not declared with `$state(...)`. Changing its value will not correctly trigger updates
    let scrollContainer: HTMLDivElement;

    let showOptions = $state(false);
    let optionsPage: "hotkeyConfig" | "connectConfig" = $state("hotkeyConfig");

    let rawSrts = $state("");

    let db: SubtitleDatabase;
    let mountingTracker: SegmentMountingTracker;

    let segments: ParsedSegmentObj[] = $state([]);

    // Remove the $effect block and replace with:

    // Create a derived value that only depends on rawSrts
    const segmentsFromSrt: ParsedSegmentObj[] = $derived.by(() => {
        if (!rawSrts.trim()) return [];

        console.log("Processing rawSrts");
        const blocks = rawSrts.trim().split(/\n\s*\n/);
        return parseSrtFileIntoSegments(blocks);
    });

    // Create another derived for the database setup
    const dbSetup = $derived.by(() => {
        const currentSegments = segmentsFromSrt;
        if (currentSegments.length === 0) return null;

        const serverLoadReplacement = prebuildLookupArrays(currentSegments);
        let subtitles: Subtitle[] = [];

        currentSegments.forEach((s) => {
            let newSub = new Subtitle(s.text, s.timecode, s.startTimeSeconds);
            subtitles.push(newSub);
        });

        const database = new SubtitleDatabase(
            subtitles,
            serverLoadReplacement.subtitleTimingToTimecodesMap,
            serverLoadReplacement.subtitleCuePointsInSec,
            serverLoadReplacement.timecodes
        );

        const tracker = new SegmentMountingTracker(currentSegments.length);

        return { database, tracker, segments: currentSegments };
    });

    // Then use these in your component:
    $effect(() => {
        const setup = dbSetup;
        if (setup) {
            db = setup.database;
            mountingTracker = setup.tracker;
            segments = setup.segments; // This assignment won't cause recursion
            console.log(setup.segments.length, "done loading");
        }
    });

    let currentHighlightedElement: HTMLDivElement | null = null;
    let currentHighlightedTimecode = "";

    let content = "";
    let playerPosition = 0;
    let formattedTime = "";

    let lastScrollTime = 0;

    // scrollToLocation(heightForSub);
    let allSegmentsMounted = false;

    let registeredHotkeys: HotkeyRegister = $state({
        screenshot: "loading",
        audioClip: "loading",
        copySubtitle: "loading",
        copyWord: "loading"
    });

    let failCount = 0;

    // TODO: User edits the example sentence in the input, the reactive variable changes to house it.
    let selectedSubtitleText = $state("");
    // TODO: User edits the target word in the input, the reactive variable changes to house it.
    let selectedTargetWordText = $state("");
    // TODO: User puts in target word, it's validated as a real word in <target language>.
    // THEN, the word gets a "word audio" mp3 from a service.
    let screenshotDataUrl = $state("");
    let mp3DataUrl = $state("");
    let audioClipPath = "";
    let isClipping = false;

    async function loadHotkeysIntoRegister() {
        //
        if (window.electronAPI?.getHotkeys) {
            const saved: HotkeyRegister = await window.electronAPI.getHotkeys();
            if (saved) {
                registeredHotkeys = { ...saved };
            }
        }
    }

    // TODO: On load app, Ask the backend, "Hey are you there? If so is any media loaded?"
    // so app can "just know" if the SRT is already up and running

    onMount(() => {
        (window as any).playerPositionDevTool = playerPositionDevTool;
        (window as any).timecodeDevTool = timecodeDevTool;
        (window as any).resetHotkeys = resetAllHotkeys;

        // TODO: Change from h ardocded subtitle file,
        // Change to "GEt subtitle from MPV, load actual patH"

        // data.segments.forEach((s) => {
        //     let newSub = new Subtitle(s.text, s.timecode, s.startTimeSeconds);
        //     subtitles.push(newSub);
        // });

        // db = new SubtitleDatabase(
        //     subtitles,
        //     data.subtitleTimingToTimecodesMap,
        //     data.subtitleCuePointsInSec,
        //     data.timecodes
        // );
        // mountingTracker = new SegmentMountingTracker(data.segments.length);

        // Expose for testing
        if (typeof window !== "undefined") {
            window.allSegmentsMounted = false;
            window.testInteger = 99;
        }

        loadHotkeysIntoRegister();

        if (window.electronAPI) {
            console.log("electronAPI is available, setting up listeners...");

            window.electronAPI.onDefaultAudio((audioDataURL) => {
                console.log("Default silence audio received:", audioDataURL?.substring(0, 50) + "...");
                mp3DataUrl = audioDataURL;
            });

            setTimeout(async () => {
                // console.log("Manually requesting default audio...");
                try {
                    await window.electronAPI.requestDefaultAudio();
                    // console.log("Manual request completed");
                } catch (error) {
                    console.error("Manual request failed:", error);
                }
                // 100 ms to ready all listeners
            }, 100);
            console.log("Running onMPVstate");
            window.electronAPI.onMPVState((mpvState) => {
                // content :  "⏱️  0:13.6 / 22:35.7 (1.0%)"
                // formatted_duration :  "22:35.7"
                // formatted_time :  "0:13.6"
                // progress :  1
                // time_pos :  13.555
                // timestamp :  1753652691.9598007
                // type :  "time_update"
                content = mpvState.content;
                playerPosition = mpvState.time_pos;
                formattedTime = mpvState.formatted_time;

                // Auto-scroll to current position (throttled)
                const now = Date.now();
                const enabledUpdates = failCount < 3;
                if (now - lastScrollTime > 2000 && enabledUpdates) {
                    try {
                        // Throttle to every 500ms
                        highlightPlayerPositionSegment(playerPosition);
                        scrollToClosestSubtitle(playerPosition, db, scrollContainer);

                        lastScrollTime = now;
                    } catch (e) {
                        failCount += 1;
                    }
                }

                if (isCommandResponse(mpvState)) {
                    handleCommandResponse(mpvState);
                }
            });
            // Handle screenshot data separately
            window.electronAPI.onScreenshotReady((dataURL: string) => {
                console.log("in the +page.svelte screenshot api:", dataURL.substring(0, 50) + "...");
                screenshotDataUrl = dataURL; // Store the data URL
            });
            window.electronAPI.onAudioReady((dataURL: string) => {
                console.log("in the +page.svelte screenshot api:", dataURL.substring(0, 50) + "...");
                mp3DataUrl = dataURL; // Store the data URL
            });
            window.electronAPI.forwardSubtitleInfo((rawSrtContent: string) => {
                console.log("In the +page.svelte SRT file loader:", rawSrtContent.length);
                rawSrts = rawSrtContent;
            });
            window.electronAPI.requestCurrentSubtitles((rawSrtContent: string) => {
                rawSrts = rawSrtContent;
            });
        } else {
            console.error("electronAPI not available");
        }
    });

    function isCommandResponse(mpvStateInfo: MPVStateData): mpvStateInfo is MPVStateData & CommandResponse {
        return mpvStateInfo.type === "command_response" && "command" in mpvStateInfo;
    }

    function highlightPlayerPositionSegment(playerPosition: number) {
        const indexToHighlight = Finder.findSubtitleIndexAtPlayerTime(playerPosition, db.subtitleCuePointsInSec);
        const timecodeStringOfTargetEl = db.subtitles[indexToHighlight].timecode;

        if (timecodeStringOfTargetEl) {
            highlightSegment(timecodeStringOfTargetEl);
        } else {
            console.log(timecodeStringOfTargetEl, "not found");
        }
    }

    export function highlightSegment(timecode: TimecodeString) {
        /*
         * Timecodes are a subtitle thing, timestamps are a player position thing.
         */
        if (currentHighlightedElement) {
            currentHighlightedElement.classList.remove("highlighted");
        }
        const element = mountingTracker.getElement(timecode);

        if (element) {
            element.classList.add("highlighted");
            currentHighlightedElement = element;
            currentHighlightedTimecode = timecode;
        }
    }

    let callcount = 0;

    export function storeSegmentPosition(timecode: TimecodeString, y: number, element: HTMLDivElement) {
        if (!mountingTracker) {
            console.error("mountingTracker not initialized");
            return;
        }

        callcount += 1;

        window.callcount = callcount;

        const result = mountingTracker.storeSegmentPosition(timecode, y, element, db);

        if (result.isComplete) {
            allSegmentsMounted = true;
            // Expose to window for testing
            if (typeof window !== "undefined") {
                window.allSegmentsMounted = true;
            }
        }
    }

    function toggleOptions() {
        //
        showOptions = !showOptions;
    }

    function switchPageType() {
        // switches them
        if (optionsPage === "hotkeyConfig") {
            optionsPage = "connectConfig";
        } else {
            optionsPage = "hotkeyConfig";
        }
    }

    function updateMainPageHotkeys(config: HotkeyRegister) {
        const update = {
            screenshot: config.screenshot || "loading",
            audioClip: config.audioClip || "loading",
            copySubtitle: config.copySubtitle || "loading",
            copyWord: config.copyWord || "loading"
        };
        registeredHotkeys = update;
    }

    function handleKeyDown(e: KeyboardEvent) {
        // Build hotkey string
        const parts: string[] = [];
        if (e.ctrlKey) parts.push("Ctrl");
        if (e.shiftKey) parts.push("Shift");
        if (e.altKey) parts.push("Alt");
        if (e.metaKey) parts.push("Cmd");

        let key = e.key;
        if (key === " ") key = "Space";
        else if (key.length === 1) key = key.toUpperCase();

        parts.push(key);

        const hotkeyString = parts.join(" + ");

        // Check if this matches a registered hotkey, i.e.
        // the q, " ['Ctrl + Shift + S', 'F5', 'Ctrl + C', 'Ctrl + X'] contains "Ctrl + X" ?""
        const action = Object.entries(registeredHotkeys).find(([k, v]) => v === hotkeyString)?.[0];
        if (action) {
            e.preventDefault();
            executeAction(action);
        }
    }

    let currentlyRecording = $state(false);

    function executeAction(action: string) {
        switch (action) {
            case "screenshot":
                window.electronAPI?.takeScreenshot();
                break;
            case "audioClip":
                if (currentlyRecording) {
                    window.electronAPI?.concludeAudioClip();
                    currentlyRecording = false;
                } else {
                    currentlyRecording = true;
                    window.electronAPI?.startAudioClip();
                }
                break;
            case "copySubtitle":
                copySelectedSubtitle();
                break;
            case "copyWord":
                copySelectedWord();
                break;
        }
    }

    function handleCommandResponse(commandResponse: CommandResponse) {
        console.log("Command response:", commandResponse.command);

        switch (commandResponse.command) {
            case "take_screenshot":
                if (commandResponse.success && commandResponse.file_path) {
                    screenshotDataUrl = commandResponse.file_path;

                    console.log("Screenshot saved!");
                }
                break;

            case "start_audio_clip":
                if (commandResponse.success) {
                    isClipping = true;
                    console.log("Started audio clipping");
                }
                break;

            case "end_audio_clip":
                isClipping = false;
                if (commandResponse.success && commandResponse.file_path) {
                    audioClipPath = commandResponse.file_path;
                    console.log("Audio clip saved!");
                }
                break;
        }
    }

    function copySelectedSubtitle() {
        /** MOSTLY this is just putting the subtitle text
         * into the state var so i can push it to input field.
         */
        try {
            // Get the currently selected text from the window
            const selection = window.getSelection();
            const selectedText = selection?.toString().trim() || "";

            if (!selectedText) return;

            selectedSubtitleText = selectedText;
            // FIXME: Need to process it. If two subtitles units are copied, There is no "\n" char
            // where the \n or a whitespace really belogns. so it's: "if on separate subtitle, insert ' ' before join"
            navigator.clipboard.writeText(selectedText);
        } catch (error) {
            console.error("Error in copySelectedSubtitle:", error);
        }
    }

    function copySelectedWord() {
        /** MOSTLY this is just putting the subtitle word
         * into the state var so i can push it to input field.
         */
        try {
            // Get the currently selected text from the window
            const selection = window.getSelection();
            const selectedText = selection?.toString().trim() || "";

            if (!selectedText) return;

            selectedTargetWordText = selectedText;
            // FIXME: Need to process it. If two subtitles units are copied, There is no "\n" char
            // where the \n or a whitespace really belogns. so it's: "if on separate subtitle, insert ' ' before join"
            navigator.clipboard.writeText(selectedText);
        } catch (error) {
            console.error("Error in copySelectedSubtitle:", error);
        }
    }

    function pushFieldMappingsUpdate(update: object) {
        console.log(update, "field mappings update");
    }

    export function playerPositionDevTool(playerPosition: PlayerPosition) {
        scrollToClosestSubtitle(playerPosition, db, scrollContainer);
    }
    export function timecodeDevTool(timecode: TimecodeString) {
        // tiumecode to player position
        const height = db.getHeightFromTimecode(timecode);
        scrollToLocation(height, scrollContainer);
    }

    export function restoreUpdates() {
        //
    }

    async function resetAllHotkeys() {
        const hotkeysforreset = {
            screenshot: "Not set",
            audioClip: "Not set",
            copySubtitle: "Not set",
            copyWord: "Not set"
        };

        if (window.electronAPI?.saveHotkeys) {
            await window.electronAPI.saveHotkeys(hotkeysforreset);
        }
    }
</script>

<svelte:window on:keydown={handleKeyDown} />

<!-- 424 components stay alive using :hidden -->
<div class="main-content" class:hidden={showOptions}>
    <div class="container">
        <div class="subtitle-panel">
            <div class="subtitle-header">Subtitles</div>
            <div class="subtitle-content" data-testid="scroll-container" bind:this={scrollContainer}>
                {#if segments.length > 0}
                    {#each segments as segment}
                        <SubtitleSegment
                            index={segment.index}
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
        <CardBuilder
            {showOptions}
            {toggleOptions}
            exampleSentenceField={selectedSubtitleText}
            targetWordField={selectedTargetWordText}
            {screenshotDataUrl}
            mp3snippet={mp3DataUrl}
            {registeredHotkeys}
        />
    </div>
</div>
<div class="options-overlay" class:visible={showOptions}>
    {#if optionsPage === "hotkeyConfig"}
        <HotkeyConfig {showOptions} {toggleOptions} {updateMainPageHotkeys} {switchPageType} />
    {:else}
        <FieldMappingConfig
            {showOptions}
            {toggleOptions}
            {switchPageType}
            updateFieldMappings={pushFieldMappingsUpdate}
        />
    {/if}
</div>

<style>
    .container {
        display: flex;
        height: 100vh;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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

    .hidden {
        display: none;
    }

    .options-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: none;
    }

    .options-overlay.visible {
        display: block;
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
