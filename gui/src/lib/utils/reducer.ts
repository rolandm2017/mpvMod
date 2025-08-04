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

export type StateAction =
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

// Pure reducer function - easy to test
export function fieldMappingReducer(state: FieldMappingState, action: StateAction): FieldMappingState {
    switch (action.type) {
        case "SET_FIELD_MAPPING":
            return {
                ...state,
                fieldMappings: {
                    ...state.fieldMappings,
                    [action.fieldName]: action.ankiField
                },
                isDirty: true
            };

        case "SET_SELECTED_DECK":
            return {
                ...state,
                selectedDeck: action.deck,
                isDirty: true
            };

        case "SET_SELECTED_NOTE_TYPE":
            return {
                ...state,
                selectedNoteType: action.noteType,
                isDirty: true
            };

        case "SET_AVAILABLE_DECKS":
            return {
                ...state,
                availableDecks: action.decks,
                // Auto-select first deck if none selected and decks available
                selectedDeck: !state.selectedDeck && action.decks.length > 0 ? action.decks[0] : state.selectedDeck,
                isDirty: !state.selectedDeck && action.decks.length > 0 ? true : state.isDirty
            };

        case "SET_AVAILABLE_NOTE_TYPES":
            return {
                ...state,
                availableNoteTypes: action.noteTypes,
                // Auto-select first note type if none selected and types available
                selectedNoteType:
                    !state.selectedNoteType && action.noteTypes.length > 0
                        ? action.noteTypes[0]
                        : state.selectedNoteType,
                isDirty: !state.selectedNoteType && action.noteTypes.length > 0 ? true : state.isDirty
            };

        case "SET_AVAILABLE_ANKI_FIELDS":
            return {
                ...state,
                availableAnkiFields: action.fields
            };

        case "SET_LOADING":
            return {
                ...state,
                isLoading: action.loading
            };

        case "MARK_SAVED":
            return {
                ...state,
                lastSaved: new Date(),
                isDirty: false
            };

        case "LOAD_STATE":
            return {
                ...state,
                ...action.state,
                isDirty: false,
                lastSaved: new Date()
            };

        case "RESET_TO_DEFAULTS":
            return {
                ...state,
                fieldMappings: {
                    targetWord: "Front",
                    exampleSentence: "Back",
                    nativeTranslation: "Translation",
                    sentenceAudio: "Audio",
                    screenshot: "Image"
                },
                selectedDeck: "",
                selectedNoteType: "",
                isDirty: true
            };

        default:
            return state;
    }
}

// Initial state factory
export function createInitialState(): FieldMappingState {
    return {
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
    };
}

// Service class for side effects only
export class FieldMappingService {
    private ankiClient: AnkiClient;

    constructor(ankiClient: AnkiClient) {
        this.ankiClient = ankiClient;
    }

    async loadFromStorage(): Promise<Partial<FieldMappingState> | null> {
        if (window.electronAPI?.getFieldMappings) {
            try {
                const saved = await window.electronAPI.getFieldMappings();
                if (saved) {
                    return {
                        fieldMappings: saved.fieldMappings,
                        selectedDeck: saved.selectedDeck || "",
                        selectedNoteType: saved.selectedNoteType || ""
                    };
                }
            } catch (error) {
                console.error("Failed to load field mappings:", error);
            }
        }
        return null;
    }

    async saveToStorage(state: FieldMappingState): Promise<void> {
        try {
            if (window.electronAPI?.saveFieldMappings) {
                await window.electronAPI.saveFieldMappings({
                    selectedDeck: state.selectedDeck,
                    selectedNoteType: state.selectedNoteType,
                    fieldMappings: { ...state.fieldMappings }
                });
            }
        } catch (error) {
            console.error("Failed to save field mappings:", error);
            throw error;
        }
    }

    async fetchAnkiData(): Promise<{
        decks?: string[];
        noteTypes?: string[];
        fields?: string[];
    }> {
        try {
            const [decksResult, noteTypesResult] = await Promise.all([
                this.ankiClient.getDeckNames(),
                this.ankiClient.getNoteTypes()
            ]);

            const result: any = {};

            if (decksResult.success) {
                result.decks = decksResult.decks;
            }

            if (noteTypesResult.success) {
                result.noteTypes = noteTypesResult.noteTypes;
            }

            return result;
        } catch (error) {
            console.error("Failed to fetch Anki data:", error);
            throw error;
        }
    }

    async fetchNoteTypeFields(noteType: string): Promise<string[] | null> {
        try {
            const fieldsResult = await this.ankiClient.getModelFields(noteType);
            return fieldsResult.success ? fieldsResult.fields : null;
        } catch (error) {
            console.error("Failed to fetch note type fields:", error);
            return null;
        }
    }

    getExportableState(state: FieldMappingState) {
        return {
            fieldMappings: state.fieldMappings,
            selectedDeck: state.selectedDeck,
            selectedNoteType: state.selectedNoteType
        };
    }
}
