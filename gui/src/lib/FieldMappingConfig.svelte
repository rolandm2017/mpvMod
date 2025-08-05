<!-- FieldMappingConfig -->
<script lang="ts">
    import { onMount } from "svelte";
    import FieldMappingItem from "./components/FieldMappingItem.svelte";
    import { AnkiClient } from "$lib/api/ankiClient";
    import {
        fieldMappingReducer,
        createInitialState,
        FieldMappingService,
        type StateAction,
        type FieldMappings
    } from "./utils/reducer";

    let { showOptions, toggleOptions, switchPageType, updateFieldMappings } = $props();

    // Svelte state lives here
    let state = $state(createInitialState());

    // Service for side effects
    const service = new FieldMappingService(new AnkiClient());

    // Debounced save
    let saveTimeout: ReturnType<typeof setTimeout> | null = null;

    // Card Builder field definitions
    const cardBuilderFields: Array<{
        name: keyof FieldMappings;
        title: string;
        description: string;
    }> = [
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

    // Dispatch function
    function dispatch(action: StateAction) {
        const newState = fieldMappingReducer(state, action);
        state = newState;

        // Auto-save if dirty (but not on initial load)
        if (newState.isDirty && action.type !== "LOAD_STATE") {
            debouncedSave();
        }

        // Notify parent of changes
        updateFieldMappings(service.getExportableState(newState));
    }

    // Debounced save to prevent excessive saves
    function debouncedSave() {
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }

        saveTimeout = setTimeout(async () => {
            try {
                await service.saveToStorage(state);
                dispatch({ type: "MARK_SAVED" });
                console.log("Field mappings saved automatically");
            } catch (error) {
                console.error("Failed to save field mappings:", error);
            }
        }, 500); // 500ms debounce
    }

    // Initialize on mount
    onMount(async () => {
        try {
            // Load saved state first
            const savedState = await service.loadFromStorage();
            if (savedState) {
                dispatch({ type: "LOAD_STATE", state: savedState });
            }

            // Then fetch fresh Anki data
            await refreshAnkiData();
        } catch (error) {
            console.error("Failed to initialize:", error);
        }
    });

    // Action handlers
    async function refreshAnkiData() {
        dispatch({ type: "SET_LOADING", loading: true });

        try {
            const ankiData = await service.fetchAnkiData();

            if (ankiData.decks) {
                dispatch({ type: "SET_AVAILABLE_DECKS", decks: ankiData.decks });
            }

            if (ankiData.noteTypes) {
                dispatch({ type: "SET_AVAILABLE_NOTE_TYPES", noteTypes: ankiData.noteTypes });
            }

            // If we have a selected note type, fetch its fields
            if (state.selectedNoteType) {
                const fields = await service.fetchNoteTypeFields(state.selectedNoteType);
                if (fields) {
                    dispatch({ type: "SET_AVAILABLE_ANKI_FIELDS", fields });
                }
            }
        } catch (error) {
            console.error("Failed to fetch Anki data:", error);
        } finally {
            dispatch({ type: "SET_LOADING", loading: false });
        }
    }

    function handleUpdateSelectedDeck(event: Event) {
        const target = event.target as HTMLSelectElement;
        dispatch({ type: "SET_SELECTED_DECK", deck: target.value });
    }

    async function handleNoteTypeChange(noteType: string) {
        dispatch({ type: "SET_SELECTED_NOTE_TYPE", noteType });

        // Fetch fields for this note type
        dispatch({ type: "SET_LOADING", loading: true });
        try {
            const fields = await service.fetchNoteTypeFields(noteType);
            if (fields) {
                dispatch({ type: "SET_AVAILABLE_ANKI_FIELDS", fields });
            }
        } catch (error) {
            console.error("Failed to fetch note type fields:", error);
        } finally {
            dispatch({ type: "SET_LOADING", loading: false });
        }
    }

    function updateMapping(fieldName: string, ankiField: string) {
        dispatch({
            type: "SET_FIELD_MAPPING",
            fieldName: fieldName as keyof FieldMappings,
            ankiField
        });
    }

    function resetToDefaults() {
        if (confirm("Reset all settings to defaults?")) {
            dispatch({ type: "RESET_TO_DEFAULTS" });
        }
    }
</script>

<div class="field-mapping-config">
    <div class="flex-row">
        <div class="config-header">
            <h2>Field Mapping Configuration</h2>
            <p>Map Card Builder fields to your Anki note fields</p>
            {#if state.isDirty}
                <small class="dirty-indicator">● Unsaved changes</small>
            {:else if state.lastSaved}
                <small class="saved-indicator">✓ Saved {state.lastSaved.toLocaleTimeString()}</small>
            {/if}
        </div>
        <div class="header-actions">
            <button class="secondary-btn" onclick={resetToDefaults}>Reset Defaults</button>
            <button class="secondary-btn" onclick={refreshAnkiData} disabled={state.isLoading}>
                {state.isLoading ? "Loading..." : "Refresh"}
            </button>
            <button class="secondary-btn" onclick={switchPageType}>Hotkey Config</button>
            <button class="primary-btn" onclick={toggleOptions}>
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
                        bind:value={state.selectedDeck}
                        onchange={handleUpdateSelectedDeck}
                        class="config-select"
                        disabled={state.isLoading}
                    >
                        {#if state.availableDecks.length === 0}
                            <option value="" disabled>
                                {state.isLoading ? "Loading decks..." : "No decks found"}
                            </option>
                        {:else}
                            {#each state.availableDecks as deck}
                                <option value={deck}>{deck}</option>
                            {/each}
                        {/if}
                    </select>
                </div>

                <div class="config-item">
                    <label for="note-type-selector" class="config-label">Note Type</label>
                    <select
                        id="note-type-selector"
                        bind:value={state.selectedNoteType}
                        onchange={() => handleNoteTypeChange(state.selectedNoteType)}
                        class="config-select"
                        disabled={state.isLoading}
                    >
                        {#if state.availableNoteTypes.length === 0}
                            <option value="" disabled>
                                {state.isLoading ? "Loading note types..." : "No note types found"}
                            </option>
                        {:else}
                            {#each state.availableNoteTypes as noteType}
                                <option value={noteType}>{noteType}</option>
                            {/each}
                        {/if}
                    </select>
                </div>
            </div>
        </div>

        <!-- Field Mappings -->
        <div class="field-mappings-section">
            <h3 class="section-title">Field Mappings</h3>

            {#each cardBuilderFields as field}
                <FieldMappingItem
                    {field}
                    availableAnkiFields={state.availableAnkiFields}
                    currentValue={state.fieldMappings[field.name]}
                    onMappingChange={updateMapping}
                />
            {/each}
        </div>
    </div>

    <div class="config-footer">
        <div class="status-info">
            <p class="status-text">
                <span class="status-indicator connected"></span>
                Connected to Anki ({state.availableDecks.length} decks, {state.availableNoteTypes.length} note types, {state
                    .availableAnkiFields.length} fields available)
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
        margin: 0 0 4px 0;
        color: #aaa;
        font-size: 14px;
    }

    .dirty-indicator {
        color: #ffc107;
        font-weight: 500;
    }

    .saved-indicator {
        color: #28a745;
        font-weight: 500;
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

    .config-select:hover:not(:disabled) {
        border-color: #777;
    }

    .config-select:focus {
        outline: none;
        border-color: #0077cc;
        box-shadow: 0 0 0 3px rgba(0, 119, 204, 0.2);
    }

    .config-select:disabled {
        opacity: 0.6;
        cursor: not-allowed;
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

    button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    button:active:not(:disabled) {
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
