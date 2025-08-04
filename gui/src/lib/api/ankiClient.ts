// src/lib/anki-client.ts

import type { GetDecksResponse, GetFieldsResponse, GetNoteTypesResponse } from "$lib/responses.interface";

// Client that calls your SvelteKit API routes instead of AnkiConnect directly
export class AnkiClient {
    private async apiCall<T>(endpoint: string, params?: URLSearchParams): Promise<T> {
        const url = params ? `${endpoint}?${params.toString()}` : endpoint;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API call failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || "Unknown API error");
        }

        return result;
    }

    async checkConnection() {
        return await this.apiCall("/api/anki/connection");
    }

    async getDeckNames(targetDeck?: string): Promise<GetDecksResponse> {
        const params = targetDeck ? new URLSearchParams({ target: targetDeck }) : undefined;
        return await this.apiCall("/api/anki/decks", params);
    }

    async getNoteTypes(targetNoteType?: string): Promise<GetNoteTypesResponse> {
        const params = targetNoteType ? new URLSearchParams({ target: targetNoteType }) : undefined;
        return await this.apiCall("/api/anki/note-types", params);
    }

    async getModelFields(modelName: string): Promise<GetFieldsResponse> {
        const params = new URLSearchParams({ model: modelName });
        return await this.apiCall("/api/anki/fields", params);
    }

    async checkAll() {
        return await this.apiCall("/api/anki/check-all");
    }
}
