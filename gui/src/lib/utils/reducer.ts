import type { AnkiClient } from "$lib/api/ankiClient";

export interface FieldMappings {
    targetWord: string;
    exampleSentence: string;
    nativeTranslation: string;
    sentenceAudio: string;
    screenshot: string;
}

export interface FieldMappingState {
    fieldMappings: FieldMappings;
    availableDecks: string[];
    availableNoteTypes: string[];
    availableAnkiFields: string[];
    selectedDeck: string;
    selectedNoteType: string;
    isLoading: boolean;
    lastSaved: Date | null;
    isDirty: boolean;
}

type StateAction =
    | { type: "SET_FIELD_MAPPING"; fieldName: keyof FieldMappings; ankiField: string }
    | { type: "SET_SELECTED_DECK"; deck: string }
    | { type: "SET_SELECTED_NOTE_TYPE"; noteType: string }
    | { type: "SET_AVAILABLE_DECKS"; decks: string[] }
    | { type: "SET_AVAILABLE_NOTE_TYPES"; noteTypes: string[] }
    | { type: "SET_AVAILABLE_ANKI_FIELDS"; fields: string[] }
    | { type: "SET_LOADING"; loading: boolean }
    | { type: "MARK_SAVED" }
    | { type: "LOAD_STATE"; state: Partial<FieldMappingState> }
    | { type: "RESET_TO_DEFAULTS" };

export class FieldMappingStateManager {
    private state: FieldMappingState = $state({
        fieldMappings: {
            targetWord: "Front",
            exampleSentence: "Back",
            nativeTranslation: "Translation",
            sentenceAudio: "Audio",
            screenshot: "Image"
        },
        availableDecks: [],
        availableNoteTypes: [],
        availableAnkiFields: [
            "Front",
            "Back",
            "Translation",
            "Audio",
            "Image",
            "Source",
            "Notes",
            "Definition",
            "Example"
        ],
        selectedDeck: "",
        selectedNoteType: "",
        isLoading: false,
        lastSaved: null,
        isDirty: false
    });

    private ankiClient: AnkiClient;
    private onStateChange?: (state: FieldMappingState) => void;

    constructor(ankiClient: AnkiClient, onStateChange?: (state: FieldMappingState) => void) {
        this.ankiClient = ankiClient;
        this.onStateChange = onStateChange;
    }

    // Getter for reactive state access
    get currentState(): FieldMappingState {
        return this.state;
    }

    // State reducer
    private reduce(action: StateAction): void {
        const oldState = { ...this.state };

        switch (action.type) {
            case "SET_FIELD_MAPPING":
                this.state.fieldMappings[action.fieldName] = action.ankiField;
                this.state.isDirty = true;
                break;

            case "SET_SELECTED_DECK":
                this.state.selectedDeck = action.deck;
                this.state.isDirty = true;
                break;

            case "SET_SELECTED_NOTE_TYPE":
                this.state.selectedNoteType = action.noteType;
                this.state.isDirty = true;
                break;

            case "SET_AVAILABLE_DECKS":
                this.state.availableDecks = action.decks;
                // Auto-select first deck if none selected and decks available
                if (!this.state.selectedDeck && action.decks.length > 0) {
                    this.state.selectedDeck = action.decks[0];
                    this.state.isDirty = true;
                }
                break;

            case "SET_AVAILABLE_NOTE_TYPES":
                this.state.availableNoteTypes = action.noteTypes;
                // Auto-select first note type if none selected and types available
                if (!this.state.selectedNoteType && action.noteTypes.length > 0) {
                    this.state.selectedNoteType = action.noteTypes[0];
                    this.state.isDirty = true;
                }
                break;

            case "SET_AVAILABLE_ANKI_FIELDS":
                this.state.availableAnkiFields = action.fields;
                break;

            case "SET_LOADING":
                this.state.isLoading = action.loading;
                break;

            case "MARK_SAVED":
                this.state.lastSaved = new Date();
                this.state.isDirty = false;
                break;

            case "LOAD_STATE":
                Object.assign(this.state, action.state);
                this.state.isDirty = false;
                this.state.lastSaved = new Date();
                break;

            case "RESET_TO_DEFAULTS":
                this.state.fieldMappings = {
                    targetWord: "Front",
                    exampleSentence: "Back",
                    nativeTranslation: "Translation",
                    sentenceAudio: "Audio",
                    screenshot: "Image"
                };
                this.state.selectedDeck = "";
                this.state.selectedNoteType = "";
                this.state.isDirty = true;
                break;
        }

        // Auto-save if dirty (debounced)
        if (this.state.isDirty && action.type !== "LOAD_STATE") {
            this.debouncedSave();
        }

        // Notify listeners of state change
        this.onStateChange?.(this.state);
    }

    // Public action dispatchers
    dispatch(action: StateAction): void {
        this.reduce(action);
    }

    updateFieldMapping(fieldName: keyof FieldMappings, ankiField: string): void {
        this.dispatch({ type: "SET_FIELD_MAPPING", fieldName, ankiField });
    }

    setSelectedDeck(deck: string): void {
        this.dispatch({ type: "SET_SELECTED_DECK", deck });
    }

    async setSelectedNoteType(noteType: string): Promise<void> {
        this.dispatch({ type: "SET_SELECTED_NOTE_TYPE", noteType });

        // Fetch fields for this note type
        this.dispatch({ type: "SET_LOADING", loading: true });
        try {
            const fields = await this.ankiClient.getModelFields(noteType);
            if (fields.success) {
                this.dispatch({ type: "SET_AVAILABLE_ANKI_FIELDS", fields: fields.fields });
            }
        } catch (error) {
            console.error("Failed to fetch note type fields:", error);
        } finally {
            this.dispatch({ type: "SET_LOADING", loading: false });
        }
    }

    async loadFromStorage(): Promise<void> {
        if (window.electronAPI?.getFieldMappings) {
            try {
                const saved = await window.electronAPI.getFieldMappings();
                if (saved) {
                    this.dispatch({
                        type: "LOAD_STATE",
                        state: {
                            fieldMappings: saved.fieldMappings,
                            selectedDeck: saved.selectedDeck || "",
                            selectedNoteType: saved.selectedNoteType || ""
                        }
                    });
                }
            } catch (error) {
                console.error("Failed to load field mappings:", error);
            }
        }
    }

    async fetchAnkiData(): Promise<void> {
        this.dispatch({ type: "SET_LOADING", loading: true });

        try {
            // Fetch decks and note types in parallel
            const [decksResult, noteTypesResult] = await Promise.all([
                this.ankiClient.getDeckNames(),
                this.ankiClient.getNoteTypes()
            ]);

            if (decksResult.success) {
                this.dispatch({ type: "SET_AVAILABLE_DECKS", decks: decksResult.decks });
            }

            if (noteTypesResult.success) {
                this.dispatch({ type: "SET_AVAILABLE_NOTE_TYPES", noteTypes: noteTypesResult.noteTypes });
            }

            // If we have a selected note type, fetch its fields
            if (this.state.selectedNoteType) {
                const fieldsResult = await this.ankiClient.getModelFields(this.state.selectedNoteType);
                if (fieldsResult.success) {
                    this.dispatch({ type: "SET_AVAILABLE_ANKI_FIELDS", fields: fieldsResult.fields });
                }
            }
        } catch (error) {
            console.error("Failed to fetch Anki data:", error);
        } finally {
            this.dispatch({ type: "SET_LOADING", loading: false });
        }
    }

    resetToDefaults(): void {
        if (confirm("Reset all settings to defaults?")) {
            this.dispatch({ type: "RESET_TO_DEFAULTS" });
        }
    }

    // Debounced save to prevent excessive saves
    private saveTimeout: ReturnType<typeof setTimeout> | null = null;
    private debouncedSave(): void {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(() => {
            this.saveToStorage();
        }, 500); // 500ms debounce
    }

    private async saveToStorage(): Promise<void> {
        if (!this.state.isDirty) return;

        try {
            if (window.electronAPI?.saveFieldMappings) {
                await window.electronAPI.saveFieldMappings({
                    selectedDeck: this.state.selectedDeck,
                    selectedNoteType: this.state.selectedNoteType,
                    fieldMappings: { ...this.state.fieldMappings }
                });
                this.dispatch({ type: "MARK_SAVED" });
                console.log("Field mappings saved automatically");
            }
        } catch (error) {
            console.error("Failed to save field mappings:", error);
        }
    }

    // Get serializable state for parent components
    getExportableState() {
        return {
            fieldMappings: this.state.fieldMappings,
            selectedDeck: this.state.selectedDeck,
            selectedNoteType: this.state.selectedNoteType
        };
    }
}
