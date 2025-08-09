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
    import { executeActionIfHotkey, segmentsArrsAreTheSame } from "$lib/utils/mainPageUtil.js";

    let { data } = $props();

    // TODO: Feature: User clicks subtitle, they're taken to that timestamp in the video.
    // Could be a specific btn to avoid misclicks, somewhat hidden or hard to misclick.
    // TODO: A feature where, user can tikc a box that says, "start snipping a half sec before you pressed the btn"
    //              -> Feature allows for user to be a little bit late pressing start.
    // Could also have a button, "move start a bit earlier," as a different way to solve this problem.

    // TODO: IMPORTANT: The program MUST overtly state to the user, "ANKI IS NOT RUNNING" if it isn't running.
    // Anki is REQUIRED to be running for this progrram to work. AnkiConnect must be there.

    /*
     * Using a ref:
     * Zero DOM queries after initial bind
     * Zero re-renders of your 1000+ subtitles
     * Stable reference that (allegedly) survives all state changes
     */
    let scrollContainer = $state<HTMLDivElement | null>(null);

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

    // Right after your state declarations, add:
    let scrollContainerInstanceId = 0;

    // Add this effect to monitor the scrollContainer
    $effect(() => {
        if (scrollContainer) {
            scrollContainerInstanceId++;
            const id = scrollContainerInstanceId;
            console.log(`✅ ScrollContainer - CREATED (instance #${id})`, scrollContainer);

            // Watch for removal
            const observer = new MutationObserver(() => {
                if (!document.body.contains(scrollContainer)) {
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

    // let currentHighlightedElement = $state(HtmlDivElement | null)
    let currentHighlightedElement: HTMLDivElement | null = $state(null);
    let currentHighlightedTimecode = "";

    // let content = "";
    let playerPosition = $state(0);
    // let formattedTime = "";

    let lastScrollTime = $state(0);

    // scrollToLocation(heightForSub);
    let allSegmentsMounted = $state(false); // Used for debug

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
    let snippetDataUrl = $state("");
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

    let continueLogging = $state(true);

    let myGiantAwfulObject = {};

    $effect(() => {
        console.log(playerPosition, "200ru");
        if (continueLogging) {
            // console.log(scrollContainerRef, "!!!!");
            myGiantAwfulObject = {
                continueLogging,
                selectedSubtitleText,
                selectedTargetWordText,
                showOptions,
                segmentsLength: segments.length,
                screenshotDataUrl,
                mp3DataUrl,
                scrollContainer,
                // ... all your vars
                timestamp: Date.now()
                // stack: new Error().stack
            };
            showRefState("$effect");
        }
    });

    let stop = $state(false);

    onMount(() => {
        (window as any).playerPositionDevTool = playerPositionDevTool;
        (window as any).timecodeDevTool = timecodeDevTool;
        (window as any).resetHotkeys = resetAllHotkeys;
        (window as any).showRefState = showRefState;

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
            window.electronAPI.onMPVState((mpvState) => {
                // content :  "⏱️  0:13.6 / 22:35.7 (1.0%)"
                // formatted_duration :  "22:35.7"
                // formatted_time :  "0:13.6"
                // progress :  1
                // time_pos :  13.555
                // timestamp :  1753652691.9598007
                // content = mpvState.content;
                playerPosition = mpvState.time_pos;
                // formattedTime = mpvState.formatted_time;

                // Auto-scroll to current position (throttled)
                const now = Date.now();
                // const enabledUpdates = failCount < 3;
                const autoscrollUpdateMinimumDelay = 500;

                if (now - lastScrollTime > autoscrollUpdateMinimumDelay) {
                    if (stop || continueLogging == false) {
                        console.log("Logging stopped by 'stop'");
                        return;
                    }
                    // FIXME: 3rd time's the charm
                    if (!scrollContainer) {
                        continueLogging = false;
                        stop = true;
                        pauseForDebugging();
                    }

                    if (scrollContainer && db && db.subtitleCuePointsInSec && continueLogging) {
                        highlightPlayerPositionSegment(playerPosition);
                        scrollToClosestSubtitle(playerPosition, db, scrollContainer);
                        lastScrollTime = now;
                        failCount = 0;
                    }
                }

                if (isCommandResponse(mpvState)) {
                    handleCommandResponse(mpvState);
                }
            });
            // Handle screenshot data separately
            window.electronAPI.onScreenshotReady((dataUrl: string) => {
                // FIXME: Console logged eight times, implying some code ran eight times upstream
                console.log("in the +page.svelte screenshot api:", dataUrl.substring(0, 50) + "...");
                screenshotDataUrl = dataUrl; // Store the data URL
            });
            window.electronAPI.onAudioReady((dataUrl: string) => {
                console.log("in the +page.svelte screenshot api:", dataUrl.substring(0, 50) + "...");
                mp3DataUrl = dataUrl; // Store the data URL
            });
            window.electronAPI.onSnippetReady((dataUrl: string) => {
                snippetDataUrl = dataUrl;
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
        showOptions = !showOptions;
    }

    function switchPageType() {
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
        /** Puts the subtitle text * into the state var so i can push it to input field.
         * Makes it avaialable in clipboard, because user will expect it. */
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
        /** Puts the subtitle word into the state var so i can push it to input field.
         * Copied into clipboard, because user will expect it. */
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
            console.error("Error in copySelectedWord:", error);
        }
    }

    function pushFieldMappingsUpdate(update: object) {
        // TODO: Get rid of this, pretty sure it's not needed, CardBuilder <-> FieldMapper can talk
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

    function clearMedia() {
        // used to reset when done a card
        screenshotDataUrl = "";
        // TODO: DO users prefer an empty clip? dead silence
        mp3DataUrl = defaultClipData;
        snippetDataUrl = "";

        // Check immediately after
        setTimeout(() => {
            if (!scrollContainer) {
                console.warn("scrollContainer after clear (timeout):", scrollContainer);
                continueLogging = false;
                stop = true;
                // Try to recover it
                // const recovered = document.querySelector('[data-testid="scroll-container"]');
                // console.log("Attempted recovery:", recovered);
                // if (recovered) {
                //     scrollContainerRef.element = recovered as HTMLDivElement;
                //     console.log("✅ Recovered scrollContainer reference");
                // }
            }
        }, 0);
    }

    export function playerPositionDevTool(playerPosition: PlayerPosition) {
        if (scrollContainer) {
            scrollToClosestSubtitle(playerPosition, db, scrollContainer);
        }
    }
    export function timecodeDevTool(timecode: TimecodeString) {
        if (scrollContainer) {
            // tiumecode to player position
            const height = db.getHeightFromTimecode(timecode);
            scrollToLocation(height, scrollContainer);
        }
    }

    function pauseForDebugging() {
        console.error(`❌ FIRST FAILURE - No scrollContainer at playerPosition: ${playerPosition}`);

        // Log complete state before halting
        console.log("\n\n=== COMPLETE STATE DUMP ===");
        console.log("scrollContainerRef:", scrollContainer);
        console.log("showOptions:", showOptions);
        console.log("segments.length:", segments.length);
        console.log("DOM element exists?", document.querySelector('[data-testid="scroll-container"]'));
        console.log("myGiantAwfulObject:", myGiantAwfulObject);
        console.log("+++ ++ + End state dump + ++ ++");

        // Check if element was removed from DOM
        const elementInDOM = document.querySelector('[data-testid="scroll-container"]');
        if (elementInDOM) {
            console.log("Element exists in DOM but ref is null - binding issue");
        } else {
            console.log("Element completely removed from DOM");
        }
    }

    export function showRefState(src?: string) {
        // if (src) {
        //     console.log(myGiantAwfulObject, "from showRefState in " + src);
        // } else {
        //     console.log(myGiantAwfulObject, "from showRefState in devtools");
        // }
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

<svelte:window
    on:keydown={(event) => executeActionIfHotkey(event, scrollContainer, registeredHotkeys, executeAction)}
/>

<!-- 424 components stay alive using :hidden -->
<div class="main-content" class:hidden={showOptions}>
    <div class="scroll-container">
        <div class="subtitle-panel">
            <div class="subtitle-header">Subtitles</div>
            <div class="subtitle-content" data-testid="scroll-container" bind:this={scrollContainer}>
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
            mp3Clip={mp3DataUrl}
            snippet={snippetDataUrl}
            {currentlyRecording}
            {registeredHotkeys}
            {showOptions}
            {toggleOptions}
            clearTextFields={resetGatheredText}
            {clearMedia}
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
    .scroll-container {
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
