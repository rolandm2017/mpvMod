// src/lib/ankiWriter.ts

import type { BasicCardDeliverable } from "$lib/interfaces";
import type { GetDecksResponse, GetFieldsResponse, GetNoteTypesResponse } from "$lib/responses.interface";

const DECK_NAME = "customMPV"; // TEMP

// AnkiConnect payload interfaces
interface AnkiConnectNote {
    deckName: string;
    modelName: string;
    fields: Record<string, string>;
    tags?: string[];
    options?: {
        allowDuplicate?: boolean;
        duplicateScope?: string;
        duplicateScopeOptions?: {
            deckName?: string;
            checkChildren?: boolean;
            checkAllModels?: boolean;
        };
    };
    audio?: Array<{
        url?: string;
        filename: string;
        skipHash?: string;
        fields: string[];
    }>;
    video?: Array<{
        url?: string;
        filename: string;
        skipHash?: string;
        fields: string[];
    }>;
    picture?: Array<{
        url?: string;
        filename: string;
        skipHash?: string;
        fields: string[];
    }>;
}

interface AnkiConnectRequest {
    action: string;
    version: number;
    params: {
        note?: AnkiConnectNote;
        [key: string]: any;
    };
}

interface AnkiConnectResponse<T = any> {
    result: T;
    error: string | null;
}

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
            console.log("error caused by: ", body, params);
            console.log(response);
            throw new Error(`API call failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log(result, "Response.json, response.json");

        if (!result.success) {
            throw new Error(result.error || "Unknown API error");
        }

        return result;
    }

    // Helper to convert BasicCardDeliverable to AnkiConnect payload
    private createAnkiPayload(
        cardData: BasicCardDeliverable,
        noteTypeName: string = "Refold Sentence Miner: Sentence Hidden"
    ): AnkiConnectRequest {
        const note: AnkiConnectNote = {
            deckName: DECK_NAME,
            modelName: noteTypeName,
            fields: {
                // Map your data to the actual Anki field names
                Word: cardData.word,
                "Definitions 1": cardData.nativeTranslation,
                "Definitions 2": "", // Empty for now
                "Example Sentence": cardData.exampleSentence,
                "Sentence Translation": "", // Empty for now, or you could duplicate nativeTranslation
                word_audio: "", // We'll handle this via audio array below
                sentence_audio: "", // We'll handle this via audio array below
                image: "" // We'll handle this via picture array below
            },
            tags: ["auto-generated"],
            options: {
                allowDuplicate: false
            }
        };

        // Handle audio if provided - assuming it's sentence audio for now
        if (cardData.audio) {
            note.audio = [
                {
                    filename: `sentence_audio_${Date.now()}.mp3`,
                    url: cardData.audio,
                    fields: ["sentence_audio"] // Put audio in sentence_audio field
                }
            ];
        }

        // Handle image if provided
        if (cardData.image) {
            note.picture = [
                {
                    filename: `image_${Date.now()}.png`,
                    url: cardData.image,
                    fields: ["image"] // Put image in image field
                }
            ];
        }

        return {
            action: "addNote",
            version: 6,
            params: { note }
        };
    }

    async deliverCard(cardData: BasicCardDeliverable, noteTypeName?: string): Promise<number | string> {
        try {
            const ankiPayload = this.createAnkiPayload(cardData, noteTypeName);
            const result = await this.apiCall<AnkiConnectResponse<number>>("/api/anki/deliver-card", ankiPayload);
            console.log(result, "Result result");

            if (result.result === null) {
                throw new Error(result.error || "Failed to create card");
            }

            return result.result; // Returns the note ID
        } catch (error) {
            const err = error as Error;
            if (err.message.startsWith("EMPTY_NOTE:")) {
                return "EMPTY_NOTE_ERROR";
            }
            throw error;
        }
    }

    async updateCard(noteId: number, fields: Record<string, string>) {
        const payload: AnkiConnectRequest = {
            action: "updateNoteFields",
            version: 6,
            params: {
                note: {
                    fields: fields,
                    deckName: "FIXME",
                    modelName: "FIXME"
                }
            }
        };
        return await this.apiCall("/api/anki/update-card", payload);
    }
}

// Example usage:
/*
const ankiWriter = new AnkiWriter();

const cardData: BasicCardDeliverable = {
    targetDeck: "My Language Deck",
    word: "perro",
    exampleSentence: "El perro está corriendo en el parque",
    nativeTranslation: "dog",
    audio: "data:audio/mpeg;base64,//uQx...", // your audio dataURL
    image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..." // your image dataURL
};

await ankiWriter.deliverCard(cardData, "My Custom Note Type");
*/
