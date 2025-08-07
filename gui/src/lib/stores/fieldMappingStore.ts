// $lib/stores/fieldMappingStore.ts
import { writable, derived } from "svelte/store";
import { FieldMappingService } from "$lib/utils/reducer";
import { AnkiClient } from "$lib/api/ankiClient";

// The shared service instance
const service = new FieldMappingService(new AnkiClient());

// Just the data CardBuilder needs
export const fieldMappingsStore = writable({
    targetWord: "Front",
    exampleSentence: "Back",
    nativeTranslation: "Translation",
    sentenceAudio: "Audio",
    screenshot: "Image"
});

export const selectedDeckStore = writable("");

// Initialize on app start
export async function initFieldMappings() {
    const saved = await service.loadFromStorage();
    if (saved) {
        if (saved.fieldMappings) fieldMappingsStore.set(saved.fieldMappings);
        if (saved.selectedDeck) selectedDeckStore.set(saved.selectedDeck);
    }
}

// Export service for FieldMappingConfig to use
export { service as fieldMappingService };
