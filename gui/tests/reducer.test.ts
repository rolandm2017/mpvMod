import { describe, test, expect, vi, beforeEach } from "vitest";
import {
    fieldMappingReducer,
    createInitialState,
    FieldMappingService,
    type FieldMappingState
} from "$lib/utils/reducer";

// Mock AnkiClient
const mockAnkiClient = {
    getDeckNames: vi.fn(),
    getNoteTypes: vi.fn(),
    getModelFields: vi.fn()
};

// Mock window.electronAPI
const mockElectronAPI = {
    getFieldMappings: vi.fn(),
    saveFieldMappings: vi.fn()
};

global.window = {
    electronAPI: mockElectronAPI
} as any;

describe("fieldMappingReducer", () => {
    let initialState: FieldMappingState;

    beforeEach(() => {
        initialState = createInitialState();
    });

    describe("Field Mapping Actions", () => {
        test("SET_FIELD_MAPPING updates field and marks dirty", () => {
            const result = fieldMappingReducer(initialState, {
                type: "SET_FIELD_MAPPING",
                fieldName: "targetWord",
                ankiField: "CustomField"
            });

            expect(result.fieldMappings.targetWord).toBe("CustomField");
            expect(result.isDirty).toBe(true);
            // Should not mutate original state
            expect(initialState.fieldMappings.targetWord).toBe("Front");
            expect(initialState.isDirty).toBe(false);
        });

        test("SET_FIELD_MAPPING preserves other field mappings", () => {
            const result = fieldMappingReducer(initialState, {
                type: "SET_FIELD_MAPPING",
                fieldName: "targetWord",
                ankiField: "CustomField"
            });

            expect(result.fieldMappings.exampleSentence).toBe("Back");
            expect(result.fieldMappings.nativeTranslation).toBe("Translation");
        });
    });

    describe("Deck Selection", () => {
        test("SET_SELECTED_DECK updates deck and marks dirty", () => {
            const result = fieldMappingReducer(initialState, {
                type: "SET_SELECTED_DECK",
                deck: "Spanish::Verbs"
            });

            expect(result.selectedDeck).toBe("Spanish::Verbs");
            expect(result.isDirty).toBe(true);
        });

        test("SET_AVAILABLE_DECKS auto-selects first deck when none selected", () => {
            const result = fieldMappingReducer(initialState, {
                type: "SET_AVAILABLE_DECKS",
                decks: ["Deck1", "Deck2", "Deck3"]
            });

            expect(result.availableDecks).toEqual(["Deck1", "Deck2", "Deck3"]);
            expect(result.selectedDeck).toBe("Deck1");
            expect(result.isDirty).toBe(true);
        });

        test("SET_AVAILABLE_DECKS does not change existing selection", () => {
            const stateWithDeck = fieldMappingReducer(initialState, {
                type: "SET_SELECTED_DECK",
                deck: "ExistingDeck"
            });

            const result = fieldMappingReducer(stateWithDeck, {
                type: "SET_AVAILABLE_DECKS",
                decks: ["Deck1", "Deck2"]
            });

            expect(result.selectedDeck).toBe("ExistingDeck");
        });

        test("SET_AVAILABLE_DECKS with empty array does not auto-select", () => {
            const result = fieldMappingReducer(initialState, {
                type: "SET_AVAILABLE_DECKS",
                decks: []
            });

            expect(result.availableDecks).toEqual([]);
            expect(result.selectedDeck).toBe("");
            expect(result.isDirty).toBe(false);
        });
    });

    describe("Note Type Selection", () => {
        test("SET_SELECTED_NOTE_TYPE updates note type and marks dirty", () => {
            const result = fieldMappingReducer(initialState, {
                type: "SET_SELECTED_NOTE_TYPE",
                noteType: "Basic"
            });

            expect(result.selectedNoteType).toBe("Basic");
            expect(result.isDirty).toBe(true);
        });

        test("SET_AVAILABLE_NOTE_TYPES auto-selects first when none selected", () => {
            const result = fieldMappingReducer(initialState, {
                type: "SET_AVAILABLE_NOTE_TYPES",
                noteTypes: ["Basic", "Cloze", "Custom"]
            });

            expect(result.availableNoteTypes).toEqual(["Basic", "Cloze", "Custom"]);
            expect(result.selectedNoteType).toBe("Basic");
            expect(result.isDirty).toBe(true);
        });

        test("SET_AVAILABLE_NOTE_TYPES does not change existing selection", () => {
            const stateWithNoteType = fieldMappingReducer(initialState, {
                type: "SET_SELECTED_NOTE_TYPE",
                noteType: "ExistingType"
            });

            const result = fieldMappingReducer(stateWithNoteType, {
                type: "SET_AVAILABLE_NOTE_TYPES",
                noteTypes: ["Basic", "Cloze"]
            });

            expect(result.selectedNoteType).toBe("ExistingType");
        });
    });

    describe("Field Management", () => {
        test("SET_AVAILABLE_ANKI_FIELDS updates fields without marking dirty", () => {
            const result = fieldMappingReducer(initialState, {
                type: "SET_AVAILABLE_ANKI_FIELDS",
                fields: ["CustomField1", "CustomField2"]
            });

            expect(result.availableAnkiFields).toEqual(["CustomField1", "CustomField2"]);
            expect(result.isDirty).toBe(false);
        });
    });

    describe("Loading States", () => {
        test("SET_LOADING updates loading state without marking dirty", () => {
            const loadingTrue = fieldMappingReducer(initialState, {
                type: "SET_LOADING",
                loading: true
            });
            expect(loadingTrue.isLoading).toBe(true);
            expect(loadingTrue.isDirty).toBe(false);

            const loadingFalse = fieldMappingReducer(loadingTrue, {
                type: "SET_LOADING",
                loading: false
            });
            expect(loadingFalse.isLoading).toBe(false);
            expect(loadingFalse.isDirty).toBe(false);
        });
    });

    describe("Save State Management", () => {
        test("MARK_SAVED clears dirty flag and sets timestamp", () => {
            // First make the state dirty
            const dirtyState = fieldMappingReducer(initialState, {
                type: "SET_FIELD_MAPPING",
                fieldName: "targetWord",
                ankiField: "Test"
            });

            expect(dirtyState.isDirty).toBe(true);
            expect(dirtyState.lastSaved).toBeNull();

            const result = fieldMappingReducer(dirtyState, {
                type: "MARK_SAVED"
            });

            expect(result.isDirty).toBe(false);
            expect(result.lastSaved).toBeInstanceOf(Date);
        });

        test("LOAD_STATE restores state without marking dirty", () => {
            const loadedState = {
                fieldMappings: {
                    targetWord: "LoadedFront",
                    exampleSentence: "LoadedBack",
                    nativeTranslation: "LoadedTranslation",
                    sentenceAudio: "LoadedAudio",
                    screenshot: "LoadedImage"
                },
                selectedDeck: "LoadedDeck",
                selectedNoteType: "LoadedType"
            };

            const result = fieldMappingReducer(initialState, {
                type: "LOAD_STATE",
                state: loadedState
            });

            expect(result.fieldMappings).toEqual(loadedState.fieldMappings);
            expect(result.selectedDeck).toBe("LoadedDeck");
            expect(result.selectedNoteType).toBe("LoadedType");
            expect(result.isDirty).toBe(false);
            expect(result.lastSaved).toBeInstanceOf(Date);
        });

        test("LOAD_STATE preserves unspecified fields", () => {
            const result = fieldMappingReducer(initialState, {
                type: "LOAD_STATE",
                state: { selectedDeck: "OnlyDeck" }
            });

            expect(result.selectedDeck).toBe("OnlyDeck");
            expect(result.fieldMappings).toEqual(initialState.fieldMappings);
            expect(result.availableDecks).toEqual(initialState.availableDecks);
        });
    });

    describe("Reset Functionality", () => {
        test("RESET_TO_DEFAULTS restores default values and marks dirty", () => {
            // First make some changes
            let state = fieldMappingReducer(initialState, {
                type: "SET_FIELD_MAPPING",
                fieldName: "targetWord",
                ankiField: "CustomField"
            });
            state = fieldMappingReducer(state, {
                type: "SET_SELECTED_DECK",
                deck: "CustomDeck"
            });

            // Then reset
            const result = fieldMappingReducer(state, {
                type: "RESET_TO_DEFAULTS"
            });

            expect(result.fieldMappings).toEqual({
                targetWord: "Front",
                exampleSentence: "Back",
                nativeTranslation: "Translation",
                sentenceAudio: "Audio",
                screenshot: "Image"
            });
            expect(result.selectedDeck).toBe("");
            expect(result.selectedNoteType).toBe("");
            expect(result.isDirty).toBe(true);
        });

        test("RESET_TO_DEFAULTS preserves available options", () => {
            const stateWithOptions = fieldMappingReducer(initialState, {
                type: "SET_AVAILABLE_DECKS",
                decks: ["Keep1", "Keep2"]
            });

            const result = fieldMappingReducer(stateWithOptions, {
                type: "RESET_TO_DEFAULTS"
            });

            expect(result.availableDecks).toEqual(["Keep1", "Keep2"]);
        });
    });

    describe("Unknown Action", () => {
        test("unknown action returns unchanged state", () => {
            const result = fieldMappingReducer(initialState, {
                type: "UNKNOWN_ACTION"
            } as any);

            expect(result).toBe(initialState);
        });
    });

    describe("State Immutability", () => {
        test("reducer never mutates original state", () => {
            const originalState = createInitialState();
            const stateCopy = JSON.parse(JSON.stringify(originalState));

            fieldMappingReducer(originalState, {
                type: "SET_FIELD_MAPPING",
                fieldName: "targetWord",
                ankiField: "Changed"
            });

            expect(originalState).toEqual(stateCopy);
        });
    });
});

describe("FieldMappingService", () => {
    let service: FieldMappingService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new FieldMappingService(mockAnkiClient as any);
    });

    describe("loadFromStorage", () => {
        test("returns saved data when available", async () => {
            const mockSaved = {
                fieldMappings: { targetWord: "SavedFront" },
                selectedDeck: "SavedDeck",
                selectedNoteType: "SavedType"
            };
            mockElectronAPI.getFieldMappings.mockResolvedValue(mockSaved);

            const result = await service.loadFromStorage();

            expect(result).toEqual({
                fieldMappings: { targetWord: "SavedFront" },
                selectedDeck: "SavedDeck",
                selectedNoteType: "SavedType"
            });
        });

        test("returns null when no data saved", async () => {
            mockElectronAPI.getFieldMappings.mockResolvedValue(null);

            const result = await service.loadFromStorage();

            expect(result).toBeNull();
        });

        test("handles errors gracefully", async () => {
            mockElectronAPI.getFieldMappings.mockRejectedValue(new Error("Storage error"));

            const result = await service.loadFromStorage();

            expect(result).toBeNull();
        });
    });

    describe("saveToStorage", () => {
        test("saves state data", async () => {
            const state = createInitialState();
            state.selectedDeck = "TestDeck";

            await service.saveToStorage(state);

            expect(mockElectronAPI.saveFieldMappings).toHaveBeenCalledWith({
                selectedDeck: "TestDeck",
                selectedNoteType: "",
                fieldMappings: state.fieldMappings
            });
        });

        test("throws on save error", async () => {
            mockElectronAPI.saveFieldMappings.mockRejectedValue(new Error("Save failed"));

            await expect(service.saveToStorage(createInitialState())).rejects.toThrow("Save failed");
        });
    });

    describe("fetchAnkiData", () => {
        test("fetches decks and note types successfully", async () => {
            mockAnkiClient.getDeckNames.mockResolvedValue({
                success: true,
                decks: ["Deck1", "Deck2"]
            });
            mockAnkiClient.getNoteTypes.mockResolvedValue({
                success: true,
                noteTypes: ["Basic", "Cloze"]
            });

            const result = await service.fetchAnkiData();

            expect(result).toEqual({
                decks: ["Deck1", "Deck2"],
                noteTypes: ["Basic", "Cloze"]
            });
        });

        test("handles partial failures", async () => {
            mockAnkiClient.getDeckNames.mockResolvedValue({
                success: false
            });
            mockAnkiClient.getNoteTypes.mockResolvedValue({
                success: true,
                noteTypes: ["Basic"]
            });

            const result = await service.fetchAnkiData();

            expect(result).toEqual({
                noteTypes: ["Basic"]
            });
        });
    });

    describe("fetchNoteTypeFields", () => {
        test("returns fields on success", async () => {
            mockAnkiClient.getModelFields.mockResolvedValue({
                success: true,
                fields: ["Field1", "Field2"]
            });

            const result = await service.fetchNoteTypeFields("Basic");

            expect(result).toEqual(["Field1", "Field2"]);
        });

        test("returns null on failure", async () => {
            mockAnkiClient.getModelFields.mockResolvedValue({
                success: false
            });

            const result = await service.fetchNoteTypeFields("Basic");

            expect(result).toBeNull();
        });
    });

    describe("getExportableState", () => {
        test("returns serializable subset", () => {
            const state = createInitialState();
            state.selectedDeck = "TestDeck";
            state.isDirty = true;
            state.isLoading = true;

            const result = service.getExportableState(state);

            expect(result).toEqual({
                fieldMappings: state.fieldMappings,
                selectedDeck: "TestDeck",
                selectedNoteType: ""
            });

            // Should not include internal state
            expect(result).not.toHaveProperty("isDirty");
            expect(result).not.toHaveProperty("isLoading");
        });
    });
});

describe("createInitialState", () => {
    test("creates valid initial state", () => {
        const state = createInitialState();

        expect(state.fieldMappings).toEqual({
            targetWord: "Front",
            exampleSentence: "Back",
            nativeTranslation: "Translation",
            sentenceAudio: "Audio",
            screenshot: "Image"
        });
        expect(state.selectedDeck).toBe("");
        expect(state.selectedNoteType).toBe("");
        expect(state.isDirty).toBe(false);
        expect(state.isLoading).toBe(false);
        expect(state.lastSaved).toBeNull();
        expect(Array.isArray(state.availableDecks)).toBe(true);
        expect(Array.isArray(state.availableNoteTypes)).toBe(true);
        expect(Array.isArray(state.availableAnkiFields)).toBe(true);
    });
});
