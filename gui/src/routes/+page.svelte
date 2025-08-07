<!-- page.svelte, the main and only page -->
<script lang="ts">
    import { onMount, onDestroy, getContext } from "svelte";

    import { initFieldMappings } from "$lib/stores/fieldMappingStore";
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

    // TODO: A feature where, user can tikc a box that says, "start snipping a half sec before you pressed the btn"
    //              -> Feature allows for user to be a little bit late pressing start.
    // Could also have a button, "move start a bit earlier," as a different way to solve this problem.

    /*
     * Using a ref:
     * Zero DOM queries after initial bind
     * Zero re-renders of your 1000+ subtitles
     * Stable reference that survives all state changes
     */
    const scrollContainerRef = { element: null as HTMLDivElement | null };

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

    function segmentsArrsAreTheSame(segmentArrOne: ParsedSegmentObj[], segmentArrTwo: ParsedSegmentObj[]) {
        if (segmentArrOne.length !== segmentArrTwo.length) {
            console.warn("Segment arrays had differing lengths:", segmentArrOne.length, segmentArrTwo.length);
            return false;
        }
        for (let i = 0; i < segmentArrOne.length; i++) {
            if (segmentArrOne[i].timecode != segmentArrTwo[i].timecode) {
                return false;
            }
        }
        return true;
    }

    // Right after your state declarations, add:
    let scrollContainerInstanceId = 0;

    // Add this effect to monitor the scrollContainer
    $effect(() => {
        if (scrollContainerRef.element) {
            scrollContainerInstanceId++;
            const id = scrollContainerInstanceId;
            console.log(`✅ ScrollContainer CREATED (instance #${id})`, scrollContainerRef.element);

            // Mark this instance
            scrollContainerRef.element.dataset.instanceId = id.toString();

            // Watch for removal
            const observer = new MutationObserver(() => {
                if (!document.body.contains(scrollContainerRef.element)) {
                    console.error(`💀 ScrollContainer REMOVED from DOM (instance #${id})`);
                    console.trace("Container removed at:");
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });

            return () => {
                console.warn(`🔄 ScrollContainer EFFECT CLEANUP (instance #${id})`);
                observer.disconnect();
            };
        } else {
            console.warn("⚠️ ScrollContainer is NULL in effect");
        }
    });

    // Also add debugging to track what triggers the null state
    $effect(() => {
        console.log("showOptions changed to:", showOptions);
    });

    $effect(() => {
        console.log("segments array changed, length:", segments.length);
    });

    $effect(() => {
        console.log("screenshotDataUrl changed:", screenshotDataUrl ? "has data" : "empty");
    });

    $effect(() => {
        console.log("mp3DataUrl changed:", mp3DataUrl ? "has data" : "empty");
    });

    // Then use these in your component:
    $effect(() => {
        const setup = dbSetup;
        if (setup) {
            db = setup.database;
            mountingTracker = setup.tracker;
            if (segmentsArrsAreTheSame(segments, setup.segments)) {
                // Avoid recursion from re-assigning the same array.
                console.log("arrs are identical, do not reassign");

                return;
            }
            segments = setup.segments;
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

    let defaultClipData = $state("");
    // TODO: User edits the example sentence in the input, the reactive variable changes to house it.
    let selectedSubtitleText = $state("");
    // TODO: User edits the target word in the input, the reactive variable changes to house it.
    let selectedTargetWordText = $state("");
    // TODO: User puts in target word, it's validated as a real word in <target language>.
    // THEN, the word gets a "word audio" mp3 from a service.
    let screenshotDataUrl = $state("");
    let mp3DataUrl = $state("");
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

    function loadLastSavedDeckIntoState(): Promise<string> {
        return window.electronAPI.getCurrentlySavedDeck();
    }

    // TODO: On load app, Ask the backend, "Hey are you there? If so is any media loaded?"
    // so app can "just know" if the SRT is already up and running

    onMount(() => {
        (window as any).playerPositionDevTool = playerPositionDevTool;
        (window as any).timecodeDevTool = timecodeDevTool;
        (window as any).resetHotkeys = resetAllHotkeys;

        // TODO: Change from h ardocded subtitle file,
        // Change to "GEt subtitle from MPV, load actual patH"

        // TODO: Make a, "why isn't the subtitle thing moving?" alert
        // TODO: Make a, "why isn't subtitle loaded yet?" alert. "No subtitle found"

        // TODO: You click a subtitle, it takes the MPV player back to just before that text plays.

        // Expose for testing
        if (typeof window !== "undefined") {
            window.allSegmentsMounted = false;
            window.testInteger = 99;
        }

        initFieldMappings(); // not instant

        loadHotkeysIntoRegister();

        loadLastSavedDeckIntoState().then((deck) => {
            console.log(`Received deck: "${deck}" from Storage`);
            currentDeck = deck;
        });

        if (window.electronAPI) {
            // console.log("electronAPI is available, setting up listeners...");

            window.electronAPI.onDefaultAudio((audioDataURL) => {
                console.log("Default silence audio received:", audioDataURL?.substring(0, 50) + "...");
                mp3DataUrl = audioDataURL;
                defaultClipData = audioDataURL;
            });

            // FIXME: Paage mounts like ten times, every time the page refrreshes
            // FIXME: Paage mounts like ten times, every time the page refrreshes
            // FIXME: Paage mounts like ten times, every time the page refrreshes

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
                content = mpvState.content;
                playerPosition = mpvState.time_pos;
                formattedTime = mpvState.formatted_time;

                // Auto-scroll to current position (throttled)
                const now = Date.now();
                // const enabledUpdates = failCount < 3;
                const autoscrollUpdateMinimumDelay = 500;
                if (now - lastScrollTime > autoscrollUpdateMinimumDelay) {
                    try {
                        if (!scrollContainerRef.element) {
                            console.error(`❌ No scrollContainer at playerPosition: ${playerPosition}`);
                            // Try to recover
                            const element = document.querySelector('[data-testid="scroll-container"]');
                            if (element) {
                                scrollContainerRef.element = element as HTMLDivElement;
                            } else {
                                console.log("Element not in DOM at all!");
                            }
                        }

                        if (scrollContainerRef.element && db && db.subtitleCuePointsInSec) {
                            highlightPlayerPositionSegment(playerPosition);
                            scrollToClosestSubtitle(playerPosition, db, scrollContainerRef.element);
                            lastScrollTime = now;
                            failCount = 0;
                        }
                    } catch (e) {
                        const err = e as Error;
                        console.log(`Fail in setting player position with failCount "${failCount}"`);
                        console.log(`Error: ${err.message} with playerPosition: ${playerPosition}`);
                        failCount += 1;
                    }
                }

                if (isCommandResponse(mpvState)) {
                    handleCommandResponse(mpvState);
                }
            });
            // Handle screenshot data separately
            window.electronAPI.onScreenshotReady((dataURL: string) => {
                // FIXME: Console logged eight times, implying some code ran eight times upstream
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
        // Check if there's an active text selection within the subtitle content area
        const selection = window.getSelection();
        let isInSubtitleContent = false;

        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const commonAncestor = range.commonAncestorContainer;

            // Check if the selection's common ancestor is within our subtitle container
            const ancestorElement =
                commonAncestor.nodeType === Node.TEXT_NODE
                    ? commonAncestor.parentElement
                    : (commonAncestor as HTMLElement);

            isInSubtitleContent = scrollContainerRef.element?.contains(ancestorElement) || false;
        }

        // Fallback: check if the event target is within subtitle content
        if (!isInSubtitleContent) {
            const target = e.target as HTMLElement;
            isInSubtitleContent = scrollContainerRef.element?.contains(target) || false;
        }

        // Only proceed if we're in the subtitle content area
        if (!isInSubtitleContent) {
            return;
        }

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

        // Check if this matches a registered hotkey
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
                    // screenshotDataUrl = commandResponse.file_path;

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
                    // audioClipPath = commandResponse.file_path;
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

    let currentDeck = $state("");

    function changeDeckInCardBuiler(newDeckName: string) {
        currentDeck = newDeckName;
    }

    function resetGatheredText() {
        // Remember that Native Translation is local to the page
        selectedTargetWordText = "";
        selectedSubtitleText = "";
    }

    function clearMp3andScreenshot() {
        // used to reset when done a card
        screenshotDataUrl = "";
        // TODO: DO users prefer an empty clip? dead silence
        mp3DataUrl = defaultClipData;

        // Check immediately after
        setTimeout(() => {
            console.log("scrollContainer after clear (timeout):", scrollContainerRef.element);
            if (!scrollContainerRef.element) {
                // Try to recover it
                const recovered = document.querySelector('[data-testid="scroll-container"]');
                console.log("Attempted recovery:", recovered);
                if (recovered) {
                    scrollContainerRef.element = recovered as HTMLDivElement;
                    console.log("✅ Recovered scrollContainer reference");
                }
            }
        }, 0);
    }

    export function playerPositionDevTool(playerPosition: PlayerPosition) {
        if (scrollContainerRef.element) {
            scrollToClosestSubtitle(playerPosition, db, scrollContainerRef.element);
        }
    }
    export function timecodeDevTool(timecode: TimecodeString) {
        if (scrollContainerRef.element) {
            // tiumecode to player position
            const height = db.getHeightFromTimecode(timecode);
            scrollToLocation(height, scrollContainerRef.element);
        }
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
            <div class="subtitle-content" data-testid="scroll-container" bind:this={scrollContainerRef.element}>
                {#if segments.length > 0}
                    <!-- the "(segment.timecode)" acts like a React UUID key thing,
                        if the state within the page changes, and a 
                        bunch of other stuff changes, but svelte sees that 
                        the segments arr is identical, those divs will stay put -->
                    {#each segments as segment (segment.timecode)}
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
            {currentDeck}
            targetWordField={selectedTargetWordText}
            exampleSentenceField={selectedSubtitleText}
            {screenshotDataUrl}
            mp3snippet={mp3DataUrl}
            {currentlyRecording}
            {registeredHotkeys}
            {showOptions}
            {toggleOptions}
            clearTextFields={resetGatheredText}
            {clearMp3andScreenshot}
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
            {changeDeckInCardBuiler}
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
