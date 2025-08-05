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
    import type { CommandResponse, HotkeyRegister, MPVStateData } from "$lib/interfaces.js";
    import FieldMappingConfig from "$lib/FieldMappingConfig.svelte";

    let { data } = $props();

    //FIXME: src/routes/+page.svelte:20:8 `scrollContainer` is updated, but is not declared with `$state(...)`. Changing its value will not correctly trigger updates
    let scrollContainer: HTMLDivElement;

    let showOptions = $state(false);
    let optionsPage: "hotkeyConfig" | "connectConfig" = $state("hotkeyConfig");

    let subtitlePath = $state("");

    $effect(() => {
        //
        subtitlePath;
    });

    let currentHighlightedElement: HTMLDivElement | null = null;
    let currentHighlightedTimecode = "";

    let db: SubtitleDatabase;
    let mountingTracker: SegmentMountingTracker;

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

    onMount(() => {
        (window as any).playerPositionDevTool = playerPositionDevTool;
        (window as any).timecodeDevTool = timecodeDevTool;
        (window as any).resetHotkeys = resetAllHotkeys;

        let subtitles: Subtitle[] = [];

        // TODO: Change from h ardocded subtitle file,
        // Change to "GEt subtitle from MPV, load actual patH"

        // Use the pre-built arrays from server
        data.segments.forEach((s) => {
            let newSub = new Subtitle(s.text, s.timecode, s.startTimeSeconds);
            subtitles.push(newSub);
        });

        db = new SubtitleDatabase(
            subtitles,
            data.subtitleTimingToTimecodesMap,
            data.subtitleCuePointsInSec,
            data.timecodes
        );
        mountingTracker = new SegmentMountingTracker(data.segments.length);

        // Expose for testing
        if (typeof window !== "undefined") {
            window.allSegmentsMounted = false;
            window.testInteger = 99;
            window.tracker = mountingTracker;
            window.db = db;
        }

        loadHotkeysIntoRegister();

        if (window.electronAPI) {
            console.log("electronAPI is available, setting up listeners...");

            window.electronAPI.onDefaultAudio((audioDataURL) => {
                console.log("Default silence audio received:", audioDataURL?.substring(0, 50) + "...");
                mp3DataUrl = audioDataURL;
            });

            setTimeout(async () => {
                console.log("Manually requesting default audio...");
                try {
                    await window.electronAPI.requestDefaultAudio();
                    console.log("Manual request completed");
                } catch (error) {
                    console.error("Manual request failed:", error);
                }
                // 100 ms to ready all listeners
            }, 100);
            console.log("Running onMPVstate");
            window.electronAPI.onMPVState((data) => {
                // content :  "⏱️  0:13.6 / 22:35.7 (1.0%)"
                // formatted_duration :  "22:35.7"
                // formatted_time :  "0:13.6"
                // progress :  1
                // time_pos :  13.555
                // timestamp :  1753652691.9598007
                // type :  "time_update"
                content = data.content;
                playerPosition = data.time_pos;
                formattedTime = data.formatted_time;

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

                if (isCommandResponse(data)) {
                    handleCommandResponse(data);
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
            window.electronAPI.forwardSubtitleInfo((filePath: string) => {
                console.log("In the +page.svelte SRT file loader:", filePath);
                subtitlePath = filePath;
            });
        } else {
            console.error("electronAPI not available");
        }
    });

    function isCommandResponse(data: MPVStateData): data is MPVStateData & CommandResponse {
        return data.type === "command_response" && "command" in data;
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
        console.log("switch page type", optionsPage);
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
        console.log("EXECUTING: ", action);
        switch (action) {
            case "screenshot":
                window.electronAPI?.takeScreenshot();
                break;
            case "audioClip":
                // TODO:
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

    function handleCommandResponse(data: CommandResponse) {
        console.log("Command response:", data);

        switch (data.command) {
            case "take_screenshot":
                if (data.success && data.file_path) {
                    screenshotDataUrl = data.file_path;

                    console.log("Screenshot saved!");
                }
                break;

            case "start_audio_clip":
                if (data.success) {
                    isClipping = true;
                    console.log("Started audio clipping");
                }
                break;

            case "end_audio_clip":
                isClipping = false;
                if (data.success && data.file_path) {
                    audioClipPath = data.file_path;
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
            console.log("HER HEirhaewilohrfasdfdis");
            console.log("HER HEirhaewilohrfasdfdis");
            const selection = window.getSelection();
            const selectedText = selection?.toString().trim() || "";

            console.log(selectedText, "HERE");
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
                {#if data.segments.length > 0}
                    {#each data.segments as segment}
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
