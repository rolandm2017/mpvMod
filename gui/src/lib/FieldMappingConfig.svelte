<!-- FieldMappingConfig.svelte -->
<script lang="ts">
    import { onMount } from "svelte";
    import FieldMappingItem from "./components/FieldMappingItem.svelte";

    import { AnkiClient } from "$lib/api/ankiClient";
    import type { SelectedDeckInfo } from "./interfaces";

    const ankiClient = new AnkiClient();

    let { showOptions, toggleOptions, switchPageType, updateFieldMappings } = $props();

    // Field mapping state - maps CardBuilder fields to Anki fields
    let fieldMappings = $state({
        targetWord: "Front",
        exampleSentence: "Back",
        nativeTranslation: "Translation",
        sentenceAudio: "Audio",
        screenshot: "Image"
    });

    const placeholderUntilLoading = [
        "Front",
        "Back",
        "Translation",
        "Audio",
        "Image",
        "Source", // "which video file?"
        "Notes",
        "Definition",
        "Example"
    ];

    // Available Anki data
    let availableDecks = $state<string[]>([]);
    let availableNoteTypes = $state<string[]>([]);
    let availableAnkiFields = $state(placeholderUntilLoading);

    // Selected deck and note type
    let selectedDeck = $state("");
    let selectedNoteType = $state("");

    // Card Builder field definitions
    const cardBuilderFields = [
        {
            name: "targetWord",
            title: "Target Word",
            description: "The word or phrase being learned"
        },
        {
            name: "exampleSentence",
            title: "Example Sentence",
            description: "Context sentence containing the target word"
        },
        {
            name: "nativeTranslation",
            title: "Native Translation",
            description: "Translation in your native language"
        },
        {
            name: "sentenceAudio",
            title: "Sentence Audio",
            description: "Audio clip of the example sentence"
        },
        {
            name: "screenshot",
            title: "Screenshot/Image",
            description: "Visual context from the source material"
        }
    ];

    // Load saved mappings on mount
    onMount(async () => {
        // TODO: IF a deck and note type came from the store,
        // preserve those choices as dthe default option
        await loadFieldMappings();
        await fetchAnkiData();
    });

    async function loadFieldMappings() {
        // Load from electron store
        if (window.electronAPI?.getFieldMappings) {
            const saved: SelectedDeckInfo = await window.electronAPI.getFieldMappings();
            if (saved) {
                fieldMappings = { ...saved.fieldMappings };
                selectedDeck = saved.selectedDeck || "";
                selectedNoteType = saved.selectedNoteType || "";
            }
        }
    }

    async function saveFieldMappings() {
        if (window.electronAPI?.saveFieldMappings) {
            console.log("SAVING: ", selectedDeck);
            console.log(selectedNoteType, "98ru");
            await window.electronAPI.saveFieldMappings({
                selectedDeck,
                selectedNoteType,
                fieldMappings: { ...fieldMappings }
            });
        }
        // Update parent component so Main UI knows what format to send the data in
        updateFieldMappings({
            fieldMappings,
            selectedDeck,
            selectedNoteType
        });
    }

    async function fetchAnkiData() {
        // Fetch available decks, note types, and fields from Anki Connect
        const decks = await ankiClient.getDeckNames();
        if (decks.success) {
            availableDecks = decks.decks;
        } else {
            console.error(decks);
        }
        const noteTypes = await ankiClient.getNoteTypes();
        if (noteTypes.success) {
            availableNoteTypes = noteTypes.noteTypes;
        } else {
            console.error(noteTypes);
        }
    }

    async function handleNoteTypeChange(noteType: string) {
        console.log("Selected note type:", noteType);
        selectedNoteType = noteType;
        const fields = await ankiClient.getModelFields(selectedNoteType);
        if (fields.success) {
            // fields.fields is a string array.
            availableAnkiFields = fields.fields;
            console.log(fields);
            console.log("would be saved");
        }
        // TODO: OK so how to save the field mappings?
        // TODO: Save just the latest field mapping. They accidentally swap, too bad, they re-assign mappings

        saveFieldMappings();
    }

    function updateMapping(fieldName: string, ankiField: string) {
        console.log(fieldName, ankiField, "158ru");
        fieldMappings[fieldName as keyof typeof fieldMappings] = ankiField;
        console.log($state.snapshot(fieldMappings), "188ru");

        saveFieldMappings();
    }

    function resetToDefaults() {
        if (confirm("Reset all settings to defaults?")) {
            fieldMappings = {
                targetWord: "Front",
                exampleSentence: "Back",
                nativeTranslation: "Translation",
                sentenceAudio: "Audio",
                screenshot: "Image"
            };
            selectedDeck = "";
            selectedNoteType = "";
            saveFieldMappings();
        }
    }

    // TODO: ON change note type, fetch fields.

    async function printDebugInfo() {
        console.log("Deubg");
        const decks = await ankiClient.getDeckNames();
        if (decks.success) {
            availableDecks = decks.decks;
        } else {
            console.error(decks);
        }
        console.log("RESULT");
        console.log(decks);
        // const deckNames: string[] = await fieldCheckerApi.getDeckNames();
        // console.log(deckNames);
        const noteTypes = await ankiClient.getNoteTypes();
        if (noteTypes.success) {
            availableNoteTypes = noteTypes.noteTypes;
        } else {
            console.error(noteTypes);
        }
        // TODO: Let user pick deck , note type

        // TODO:" COnsole log all deck names. "
        // TODO: Put all deck names into a dropdown. Let user select the Deck.
        // TODO: Console log all note types.
        // TODO: Let user put Note Type into a dropdown for the deck.
        // TODO: Display fields possible to seelect for the Selected Note Type
        // TODO: Put a save btn
        // TODO: On store note type, update saved layout.
        // TODO: Save a layout.
    }

    function debugAgain() {
        console.log($state.snapshot(availableDecks), "188ru");
        console.log($state.snapshot(availableNoteTypes), "189ru");
    }
    // FIXME: The page has just one state.
    // FIXME: ANY state change, triggers updating the Electron store
    // FIXME: it's no more, "this is spagheetii," now it all happens in one place, one object.
    // FIXME:
</script>

<div class="field-mapping-config">
    <div class="flex-row">
        <div class="config-header" onclick={() => debugAgain()}>
            <h2>Field Mapping Configuration</h2>
            <p>Map Card Builder fields to your Anki note fields</p>
        </div>
        <div class="header-actions">
            <button class="secondary-btn" onclick={() => printDebugInfo()}> Debug </button>
            <button class="secondary-btn" onclick={() => switchPageType()}> Hotkeys </button>
            <button class="secondary-btn" onclick={resetToDefaults}> Reset Defaults </button>
            <button class="primary-btn" onclick={() => toggleOptions()}>
                {showOptions ? "Back" : "Options"}
            </button>
        </div>
    </div>

    <div class="mapping-list">
        <!-- Deck and Note Type Selection -->
        <div class="anki-config-section">
            <h3 class="section-title">Anki Configuration</h3>

            <div class="config-row">
                <div class="config-item">
                    <label for="deck-selector" class="config-label">Deck</label>
                    <select
                        id="deck-selector"
                        bind:value={selectedDeck}
                        onchange={(updatedDeck) => handleUpdateSelectedDeck(updatedDeck)}
                        class="config-select"
                    >
                        {#if availableDecks.length === 0}
                            <option value="" disabled>Select Deck...</option>
                        {:else}
                            {#if !selectedDeck}
                                {(selectedDeck = availableDecks[0])}
                            {/if}
                            {#each availableDecks as deck}
                                <option value={deck}>{deck}</option>
                            {/each}
                        {/if}
                    </select>
                </div>

                <div class="config-item">
                    <label for="note-type-selector" class="config-label">Note Type</label>
                    <select
                        id="note-type-selector"
                        bind:value={selectedNoteType}
                        onchange={() => handleNoteTypeChange(selectedNoteType)}
                        onchange={(noteType) => handleNoteTypeChange(noteType)}
                        class="config-select"
                    >
                        {#if availableNoteTypes.length === 0}
                            <option value="" disabled>Select Note Type...</option>
                        {:else}
                            {#if !selectedNoteType}
                                {(selectedNoteType = availableNoteTypes[0])}
                            {/if}
                            {#each availableNoteTypes as noteType}
                                <option value={noteType}>{noteType}</option>
                            {/each}
                        {/if}
                    </select>
                </div>
            </div>
        </div>

        <!-- Field Mappings -->
        <div class="field-mappings-section">
            <!-- // TODO: A little mouseover info icon, brings up a tooltip, "<span>"Send what to where?"</span>" -->
            <h3 class="section-title">Field Mappings</h3>

            {#each cardBuilderFields as field}
                <FieldMappingItem
                    {field}
                    {availableAnkiFields}
                    currentValue={fieldMappings[field.name as keyof typeof fieldMappings]}
                    onMappingChange={updateMapping}
                />
            {/each}
        </div>
    </div>

    <div class="config-footer">
        <div class="status-info">
            <p class="status-text">
                <span class="status-indicator connected"></span>
                Connected to Anki ({availableDecks.length} decks, {availableNoteTypes.length} note types, {availableAnkiFields.length}
                fields available)
            </p>
        </div>
    </div>
</div>

<style>
    .field-mapping-config {
        background: #2a2a2a;
        color: #e0e0e0;
        min-height: 100vh;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    .config-header {
        padding: 20px;
        background: #333;
        border-bottom: 1px solid #444;
    }

    .config-header h2 {
        margin: 0 0 8px 0;
        color: #e0e0e0;
        font-size: 20px;
        font-weight: 600;
    }

    .config-header p {
        margin: 0;
        color: #aaa;
        font-size: 14px;
    }

    .flex-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #333;
        border-bottom: 1px solid #444;
    }

    .header-actions {
        padding: 20px;
        display: flex;
        gap: 12px;
    }

    .mapping-list {
        padding: 20px;
    }

    .anki-config-section {
        margin-bottom: 32px;
        padding: 24px;
        background: #333;
        border: 1px solid #444;
        border-radius: 8px;
    }

    .field-mappings-section {
        padding: 24px;
        background: #333;
        border: 1px solid #444;
        border-radius: 8px;
    }

    .section-title {
        margin: 0 0 20px 0;
        font-size: 18px;
        font-weight: 600;
        color: #e0e0e0;
        border-bottom: 2px solid #0077cc;
        padding-bottom: 8px;
    }

    .config-row {
        display: flex;
        gap: 20px;
    }

    .config-item {
        flex: 1;
    }

    .config-label {
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
        font-weight: 500;
        color: #e0e0e0;
    }

    .config-select {
        width: 100%;
        padding: 12px 16px;
        background: #2a2a2a;
        border: 2px solid #555;
        border-radius: 6px;
        color: #e0e0e0;
        font-size: 14px;
        cursor: pointer;
        transition: border-color 0.2s ease;
    }

    .config-select:hover {
        border-color: #777;
    }

    .config-select:focus {
        outline: none;
        border-color: #0077cc;
        box-shadow: 0 0 0 3px rgba(0, 119, 204, 0.2);
    }

    .config-footer {
        padding: 20px;
        border-top: 1px solid #444;
        background: #333;
    }

    .status-info {
        display: flex;
        justify-content: center;
    }

    .status-text {
        margin: 0;
        font-size: 14px;
        color: #aaa;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .status-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
    }

    .status-indicator.connected {
        background: #28a745;
        box-shadow: 0 0 6px rgba(40, 167, 69, 0.6);
    }

    .status-indicator.disconnected {
        background: #dc3545;
        box-shadow: 0 0 6px rgba(220, 53, 69, 0.6);
    }

    /* Button styles */
    button {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .primary-btn {
        background: #0077cc;
        color: white;
    }

    .primary-btn:hover {
        background: #005fa3;
        transform: translateY(-1px);
    }

    .secondary-btn {
        background: #6c757d;
        color: white;
    }

    .secondary-btn:hover {
        background: #545b62;
        transform: translateY(-1px);
    }

    button:active {
        transform: translateY(0);
    }

    /* Responsive design */
    @media (max-width: 768px) {
        .flex-row {
            flex-direction: column;
            align-items: stretch;
        }

        .header-actions {
            padding: 10px 20px;
            justify-content: center;
        }
    }
</style>
