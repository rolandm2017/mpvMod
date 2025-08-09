<!-- CardBuilder.svelte -->
<script lang="ts">
    import Mp3Editor from "./components/Mp3Editor.svelte";
    import { get } from "svelte/store";

    import { fieldMappingsStore } from "$lib/stores/fieldMappingStore";
    import InputField from "./components/InputField.svelte";
    import RecorderAwarenessControls from "./components/RecorderAwarenessControls.svelte";
    import { AnkiWriter } from "./api/ankiWriter";
    import type { BasicCardDeliverable } from "./interfaces";
    import { onMount } from "svelte";

    // Props - data passed in from parent
    let {
        // current deck
        currentDeck,
        // text fields
        targetWordField,
        exampleSentenceField,

        // audio, img
        mp3Clip,
        screenshotDataUrl,
        snippet,
        // options
        showOptions,
        toggleOptions,
        registeredHotkeys,
        currentlyRecording,
        clearTextFields,
        clearMedia
    } = $props();

    // TODO: the text fields should come in from the parent, but, be reset by changing a card.
    // FIXME: It's actually a fixme

    // TODO: The Image container with  a back,fwd nudge btn, to nudge the screenshot frame back, fwd
    //      -> in case user "missed it" by a fraction of a frame.

    onMount(() => {
        console.log(`Current deck: "${currentDeck}", debug`);
        // fetch("/api/anki/check-all")
        //     .then((response) => response.json())
        //     .then((data) => {
        //         console.log("Available fields in your note type:");
        //         console.log(data.fields?.fields || "No fields found");

        //         console.log("\nField mapping suggestion:");
        //         console.log(data.fields?.fieldMapping || "No mapping available");

        //         console.log("\nCopy-paste ready fields:");
        //         console.log(data.fields?.copyPasteReady || "Not available");
        //     })
        //     .catch((error) => console.error("Error:", error));
    });

    // Watch for changes in screenshotDataUrl
    // $effect(() => {
    //     console.log("screenshotDataUrl changed:", screenshotDataUrl.slice(20));
    // });

    let recordingState: "idle" | "recording" | "finished" = $state("idle");
    let previousRecordingState = $state(false);

    let nativeLangTranslation = $state("");

    const writer = new AnkiWriter();

    // Function to update recording state based on currentlyRecording prop
    function updateRecordingState() {
        if (currentlyRecording && !previousRecordingState) {
            // Just started recording
            recordingState = "recording";
        } else if (!currentlyRecording && previousRecordingState) {
            // Just finished recording
            recordingState = "finished";
            // Will automatically fade back to idle after 1 second via the component
        }
        previousRecordingState = currentlyRecording;
    }

    // Watch for changes in currentlyRecording prop
    $effect(() => {
        updateRecordingState();
    });

    function sendFinishedCardToAnki() {
        // TODO: Make a "500 error: Is Anki Open?" error prompt
        const mappings = get(fieldMappingsStore);
        // TODO: Confirmation dialogue, "No snippet made. Send the whole clip?"
        let audioPayload;
        const noSnippetMade = snippet === "";
        if (noSnippetMade) {
            //
            const affirmed = confirm("No snippet found. Send the whole clip?");
            if (affirmed) {
                audioPayload = mp3Clip;
            } else {
                console.log("Canceled payload delivery. Waiting on snippet");
                return;
            }
        }
        const deliverable = {
            targetDeck: currentDeck,
            word: targetWordField,
            exampleSentence: exampleSentenceField,
            nativeTranslation: nativeLangTranslation,
            audio: snippet,
            image: screenshotDataUrl
        };
        console.log("sending: ", removeDataUrls(deliverable));
        writer.deliverCard(deliverable, mappings).then((response) => {
            console.log(response, "New card ID");
            const cardIdResponse = Number.isFinite(response);
            if (cardIdResponse) {
                resetFields();
            } else if (response === "EMPTY_NOTE_ERROR") {
                // highlight empty fields
                highlightMissingFields(deliverable);
            }
        });
    }

    function highlightMissingFields(deliverable: object) {
        //
        console.warn(deliverable, "needs highlighting");
    }

    function removeDataUrls(card: BasicCardDeliverable) {
        const { image, audio, ...newObj } = card;
        return newObj;
    }

    function handleSearchSubtitles() {
        // TODO: What on earth is this for? I like the idea of it anyway, "search subtitles"
        // TODO: Maybe it's for when the user is lost
        // console.log('Searching for:', searchQuery);
        // Add your search logic here
    }

    function handleResetAllFieldsRequest() {
        if (confirm("Are you sure you want to clear all fields?")) {
            console.log("Clearing fields");
            resetFields();
        }
    }

    // Function to handle backspace deletion
    function handleImageFieldKeydown(event: KeyboardEvent) {
        // Only allow backspace, prevent all other typing
        if (event.key === "Backspace" && screenshotDataUrl) {
            screenshotDataUrl = null;
            (event.currentTarget as HTMLElement).textContent = "";
            event.preventDefault();
        } else {
            // Prevent all other typing
            event.preventDefault();
        }
    }

    // Function to handle focus - ensures the field is focusable
    function handleImageFieldFocus(event: FocusEvent & { currentTarget: EventTarget & HTMLDivElement }) {
        console.log("Image field focused");
        console.log("Current content:", event.currentTarget.textContent);
        console.log("Current HTML:", event.currentTarget.innerHTML.slice(400));
    }

    function resetFields() {
        //
        // targetWordField = "";
        // exampleSentenceField = "";
        nativeLangTranslation = ""; // is local to the page
        clearTextFields();
        clearMedia();
    }

    let wordDefinition = $state("");
</script>

<div class="control-panel">
    <div class="panel-header flex-row">
        <div><h2 class="header-text">Card Builder</h2></div>
        <div>
            <div id="header-buttons">
                <div class="hotkey-hints flex flex-wrap gap-3 items-center">
                    <span class="hotkey-hint">img: {registeredHotkeys.screenshot}</span>
                    <span class="hotkey-hint">audio: {registeredHotkeys.audioClip}</span>
                </div>
                <!-- <div> -->
                <!-- // TODO: make a reminder of the set hotkeys top right, right here. -->
                <!-- <button class="hotkey-reminder-btn header-btns">img: F7</button> -->
                <!-- </div> -->
                <!-- // todo: make it responsive -->
                <!-- <div> -->
                <!-- // TODO: make a reminder of the set hotkeys top right, right here. -->
                <!-- <button class="hotkey-reminder-btn header-btns">audio: F8</button> -->
                <!-- </div> -->
                <div>
                    <button id="options-btn" class="primary-btn header-btns" onclick={() => toggleOptions()}>
                        {showOptions ? "Back" : "Options"}
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div class="control-section">
        <!-- <h3>Text fields</h3> -->
        <div class="input-group">
            <!-- // TODO: Need "Word" field, but also: Word translation -->
            <div class="flex-row">
                <div class="even-spacing-flex padding-right">
                    <InputField id="word-field" label="Word" bind:value={targetWordField} placeholder="Target word" />
                </div>
                <div class="even-spacing-flex">
                    <InputField
                        id="definition-one"
                        label="Definition One"
                        bind:value={wordDefinition}
                        placeholder="Definition One"
                    />
                </div>
            </div>

            <InputField
                id="example-sentence"
                label="Example sentence"
                bind:value={exampleSentenceField}
                placeholder="Subtitle snippet"
            />

            <!-- // TODO: Put a config option, "Show native sentence translation input"
                so people who don't care for it can turn it off. (Have it on by default) -->
            <InputField
                id="NL-translation"
                label="Native translation"
                bind:value={nativeLangTranslation}
                placeholder="Translated version"
            />
        </div>
    </div>

    <div class="control-section">
        <div class="flex-row">
            <div class="">
                <h3>Sentence Audio</h3>
            </div>
            <div class="">
                <!-- recorder awareness controls -->
                <RecorderAwarenessControls {recordingState} />
            </div>
        </div>
        <div class="time-controls">
            <!-- TODO: Make MP3 Editor TOGGLEABLE! -->
            <!-- // Could feature this as a toggled "autohide after 5 sec" option -->
            <!-- // Editor reveals on mouseover? On mouseover + click? -->
            <!-- //TODO: Like it's MOSTLY hidden except play, pause, until you open the editor. -->
            <!-- //TODO: The waveform, play/pause btn, etc take WAY too much space -->
            <Mp3Editor mp3={mp3Clip} />
        </div>
    </div>
    <div class="control-section">
        <!-- image header is disabled to save screen space. the container is self explanatory -->
        <!-- <h3>Image</h3> -->
        <!-- container div with an image that is dynamically set -->
        <!-- the image is about the size of the Anki thumbnail -->
        <div
            class="image-target-container"
            class:tall-container={screenshotDataUrl}
            class:short-container={!screenshotDataUrl}
        >
            <div
                class="image-target-editable"
                contenteditable={screenshotDataUrl ? "true" : "false"}
                tabindex="0"
                onkeydown={handleImageFieldKeydown}
                onfocus={handleImageFieldFocus}
                role="textbox"
                aria-label="Image field - press backspace to delete image"
            >
                {#if screenshotDataUrl}
                    <!-- //TODO: Until img dropped here, IMG hitbox should be about 1/3 as tall. -->
                    <!-- // FIXME: LIKE what do they need a large hitbox for? It's put in by the hotkey. -->
                    <img class="take-full-container" src={screenshotDataUrl} alt="MPV screenshot for Anki flashcard" />
                {:else}
                    <div class="image-placeholder"><h4>Waiting for image</h4></div>
                {/if}
            </div>
        </div>
    </div>

    <div class="control-section">
        <!-- <h3>Finalize</h3> -->
        <!-- //TODO: do i need to say it's the finalize section? They know -->
        <!-- // TODO: Make the buttons about 25% shorter -->

        <div class="button-group">
            <button class="success-btn" onclick={sendFinishedCardToAnki}> Export Card </button>
            <button class="danger-btn" onclick={handleResetAllFieldsRequest}> Clear All </button>
            <!-- TODO: Show confirmation dialogue for "Clear all?" since it's destructive -->
        </div>
    </div>

    <!-- <div class="flex justify-between items-center p-8 bg-gray-50 rounded-lg">
        <div class="w-20 h-20 bg-rose-200 rounded-lg"></div>
        <div class="w-20 h-20 bg-emerald-200 rounded-lg"></div>
        <div class="w-20 h-20 bg-sky-200 rounded-lg"></div>
    </div> -->
</div>

<style>
    /* Your styles here */

    button {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease-in-out;
        /* min-width: 120px; */
    }

    /* #options-btn {
        background-color: #c0ddff;
    } */

    #header-buttons {
        display: flex;
        justify-content: flex-end;
        /* flex-direction: column; */
    }

    .hotkey-hints {
        display: flex;
        gap: 12px;
        align-items: center;
        margin-right: 8px;
        margin-top: 10px;
        margin-left: 12px;
    }

    .hotkey-hint {
        font-size: 14px;
        color: #444;
        background-color: #f0f0f0;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: "Courier New", monospace;
        font-weight: 500;
        white-space: nowrap;
        border: 1px solid #ddd;
        user-select: none;
    }

    /* Slightly different styling for better contrast if needed */
    .hotkey-hint.alt-style {
        background-color: #e8f4f8;
        color: #555;
        border: 1px solid #c0d6e0;
    }

    /* Responsive - stack vertically on very small screens */
    @media (max-width: 680px) {
        .hotkey-hints {
            flex-direction: column;
            gap: 4px;
            align-items: flex-end;
        }

        .hotkey-hint {
            font-size: 14px;
            padding: 1px 4px;
        }
    }

    /* .hotkey-reminder-btn {
        min-width: 50px;
        background-color: #d0edaf;
    } */

    .header-btns {
        margin-top: 10px;
        margin-right: 6px;
    }

    .flex-row {
        display: flex;
        justify-content: space-between;
    }

    .even-spacing-flex {
        flex: 1 0 0;
    }

    .padding-right {
        padding-right: 20px;
    }

    .image-target-container {
        height: 170px;
        width: 340px;
        border: 4px solid grey;
        border-radius: 8px;
        display: block;
    }

    .tall-container {
        height: 170px;
    }

    .short-container {
        height: 70px;
    }

    .image-target-editable {
        height: 100%;
        width: 100%;
        background-color: #eeeeee;
        border-radius: 4px;
        border: 2px solid #ccc;
        display: flex;
        align-items: center;
        justify-content: center;
        outline: none; /* Remove default focus outline */
        cursor: text; /* Show text cursor when hovering */
        position: relative;
    }

    /* Focus state - like Anki's blue border */
    .image-target-editable:focus {
        border-color: #80bdff;
        box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }

    .image-target-editable img {
        max-height: calc(100% - 8px); /* Account for border and padding */
        max-width: calc(100% - 8px);
        height: auto;
        width: auto;
        object-fit: contain;
        display: block;
    }

    .image-placeholder {
        color: #999;
        font-style: italic;
        user-select: none; /* Prevent text selection */
        pointer-events: none; /* Make it non-interactive */
    }

    /* Hide the placeholder when there's an image */
    .image-target-editable:has(img) .image-placeholder {
        display: none;
    }

    /* Optional: Show a cursor even when image is present */
    .image-target-editable::after {
        content: "";
        position: absolute;
        right: 4px;
        top: 60%;
        width: 1px;
        height: 40px;
        background-color: #000;
        opacity: 0;
        animation: blink 1s infinite;
        transform: translateY(-50%);
    }

    .image-target-editable:focus::after {
        opacity: 1;
    }

    @keyframes blink {
        0%,
        50% {
            opacity: 1;
        }
        51%,
        100% {
            opacity: 0;
        }
    }

    .control-panel {
        flex: 1;
        /* background: #f5f5f5; */
        display: flex;
        flex-direction: column;
        overflow-y: auto;
    }

    .panel-header {
        padding: 3px 20px;
        background: #e9ecef;
        border-bottom: 1px solid #dee2e6;
        font-weight: 600;
        font-size: 1.1em;
    }

    .header-text {
        margin: 10px 0px 4px 0px;
        padding: 6px 12px;
        background-color: #eee5ed;
        font-size: 22px;
    }

    .control-section {
        padding: 16px 20px 4px 20px;
        border-bottom: 1px solid #dee2e6;
    }

    .control-section:last-child {
        border-bottom: none;
    }

    .control-section h3 {
        margin: 0 0 15px 0;
        color: #495057;
        font-size: 1em;
        font-weight: 600;
    }

    /* Optional: Add hover effect for better UX */
    /* .image-target:hover {
        border-color: #999;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    } */

    .input-group {
        margin-bottom: 15px;
    }

    .button-group {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
    }

    .success-btn {
        background: #28a745;
        color: white;
    }

    .success-btn:hover {
        background: #1e7e34;
        transform: translateY(-1px);
    }

    .danger-btn {
        background: #dc3545;
        color: white;
    }

    .danger-btn:hover {
        background: #c82333;
        transform: translateY(-1px);
    }

    button:active {
        transform: translateY(0);
    }
</style>
