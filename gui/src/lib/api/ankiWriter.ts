// src/lib/ankiWriter.ts

import type { BasicCardDeliverable, FieldMappings } from "$lib/interfaces";
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
        data?: string; // <-- add this
    }>;
    video?: Array<{
        url?: string;
        filename: string;
        skipHash?: string;
        fields: string[];
        data?: string; // <-- add this
    }>;
    picture?: Array<{
        url?: string;
        filename: string;
        skipHash?: string;
        fields: string[];
        data?: string; // <-- add this
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
        fieldMappings: FieldMappings,
        noteTypeName: string = "Refold Sentence Miner: Sentence Hidden"
    ): AnkiConnectRequest {
        function removeDataUrls(card: BasicCardDeliverable) {
            const { image, audio, ...newObj } = card;
            return newObj;
        }
        const originalPayload = {
            // Map your data to the actual Anki field names
            Word: cardData.word,
            "Definitions 1": cardData.nativeTranslation,
            "Definitions 2": "", // Empty for now
            "Example Sentence": cardData.exampleSentence,
            "Sentence Translation": "", // Empty for now, or you could duplicate nativeTranslation
            word_audio: "", // We'll handle this via audio array below
            sentence_audio: "", // We'll handle this via audio array below
            image: "" // We'll handle this via picture array below
        };

        const audioFilename = `sentence_audio_${Date.now()}.mp3`;
        const imageFilename = `image_${Date.now()}.png`;

        const fieldsPayload: Record<string, string> = {};

        // Map each source field to its Anki field using the stored mappings
        if (fieldMappings.targetWord && cardData.word) {
            fieldsPayload[fieldMappings.targetWord] = cardData.word;
        }
        if (fieldMappings.exampleSentence && cardData.exampleSentence) {
            fieldsPayload[fieldMappings.exampleSentence] = cardData.exampleSentence;
        }
        if (fieldMappings.nativeTranslation && cardData.nativeTranslation) {
            fieldsPayload[fieldMappings.nativeTranslation] = cardData.nativeTranslation;
        }
        if (fieldMappings.sentenceAudio && cardData.audio) {
            // [sound:filename.mp3]
            // for audio (Anki's sound syntax)
            // fieldsPayload[fieldMappings.sentenceAudio] = `[sound:${audioFilename}]`;
        }
        if (fieldMappings.screenshot && cardData.image) {
            // <img src="filename.png">
            // for images (HTML img tag)
            // fieldsPayload[fieldMappings.screenshot] = `<img src="${imageFilename}">`;
        }
        console.log(removeDataUrls(cardData), "cardData less dataUrls");
        console.log(fieldsPayload, "fieldsPayload");
        const note: AnkiConnectNote = {
            deckName: DECK_NAME,
            modelName: noteTypeName,
            fields: fieldsPayload,
            tags: ["auto-generated"],
            options: {
                allowDuplicate: false
            }
        };

        // Handle audio if provided - assuming it's sentence audio for now
        if (cardData.audio) {
            note.audio = [
                {
                    filename: audioFilename,
                    // https://www.perplexity.ai/search/helper-to-convert-basiccarddel-Sa6DvwnXRNGeLsppxaMVUw
                    data: cardData.audio.split(",")[1], // strip "data:...;base64,"
                    fields: ["sentence_audio"] // Put audio in sentence_audio field
                }
            ];
        }

        // Handle image if provided
        if (cardData.image) {
            note.picture = [
                {
                    filename: imageFilename,
                    // https://www.perplexity.ai/search/helper-to-convert-basiccarddel-Sa6DvwnXRNGeLsppxaMVUw
                    data: cardData.image.split(",")[1], // strip prefix
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

    async deliverCard(
        cardData: BasicCardDeliverable,
        fieldMappings: FieldMappings,
        noteTypeName?: string
    ): Promise<number | string> {
        try {
            const ankiPayload = this.createAnkiPayload(cardData, fieldMappings, noteTypeName);
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
                    deckName: "TODO",
                    modelName: "TODO"
                }
            }
        };
        return await this.apiCall("/api/anki/update-card", payload);
    }
}
