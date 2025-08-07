// src/lib/ankiWriter.ts

import type { BasicCardDeliverable } from "$lib/interfaces";
import type { GetDecksResponse, GetFieldsResponse, GetNoteTypesResponse } from "$lib/responses.interface";

// Client that calls your SvelteKit API routes instead of AnkiConnect directly
export class AnkiWriter {
    private async apiCall<T>(endpoint: string, body: any, params?: URLSearchParams): Promise<T> {
        const url = params ? `${endpoint}?${params.toString()}` : endpoint;

        const requestOptions: RequestInit = {
            method: "POST"
        };

        if (body) {
            requestOptions.headers = { "Content-Type": "application/json" };
            requestOptions.body = JSON.stringify(body);
        }

        const response = await fetch(url, requestOptions);

        if (!response.ok) {
            throw new Error(`API call failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || "Unknown API error");
        }

        return result;
    }

    async deliverCard(cardData: BasicCardDeliverable) {
        return await this.apiCall("/api/anki/deliver-card", cardData, undefined);
    }

    async updateCard() {
        // return await this.apiCall("/api/anki/update-card");
    }
}
