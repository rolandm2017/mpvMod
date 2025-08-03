// routes/api/anki/check-all/+server.ts
// Comprehensive check - equivalent to the original checkAnkiInfo function
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

// ... (copy the makeAnkiRequest function and interfaces from above)

const TARGET_DECK = "customMPV";
const TARGET_NOTE_TYPE = "Refold Sentence Miner: Sentence Hidden";

export const GET: RequestHandler = async () => {
    const results = {
        connection: null as any,
        decks: null as any,
        noteTypes: null as any,
        fields: null as any,
        summary: {
            allChecksPass: false,
            issues: [] as string[]
        }
    };

    try {
        // Check connection
        const version = await makeAnkiRequest<number>({
            action: "version",
            version: 6,
            params: {}
        });
        results.connection = { success: true, version };

        // Get decks
        const decks = await makeAnkiRequest<string[]>({
            action: "deckNames",
            version: 6,
            params: {}
        });
        const deckExists = decks.includes(TARGET_DECK);
        results.decks = { decks, targetDeck: TARGET_DECK, exists: deckExists };

        if (!deckExists) {
            results.summary.issues.push(`Deck "${TARGET_DECK}" not found`);
        }

        // Get note types
        const noteTypes = await makeAnkiRequest<string[]>({
            action: "modelNames",
            version: 6,
            params: {}
        });
        const noteTypeExists = noteTypes.includes(TARGET_NOTE_TYPE);
        results.noteTypes = { noteTypes, targetNoteType: TARGET_NOTE_TYPE, exists: noteTypeExists };

        if (!noteTypeExists) {
            results.summary.issues.push(`Note type "${TARGET_NOTE_TYPE}" not found`);
        }

        // Get fields if note type exists
        if (noteTypeExists) {
            const fields = await makeAnkiRequest<string[]>({
                action: "modelFieldNames",
                version: 6,
                params: { modelName: TARGET_NOTE_TYPE }
            });

            const fieldMapping = fields.reduce(
                (acc, field) => {
                    acc[field] = "your content here";
                    return acc;
                },
                {} as Record<string, string>
            );

            results.fields = {
                fields,
                fieldMapping,
                copyPasteReady: `fields: {\n${fields.map((field) => `    "${field}": "your content here",`).join("\n")}\n}`
            };
        }

        results.summary.allChecksPass = results.summary.issues.length === 0;

        return json({
            success: true,
            ...results
        });
    } catch (error) {
        return json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
                results,
                troubleshooting: [
                    "Make sure Anki is running",
                    "Install AnkiConnect addon if you haven't",
                    "Verify AnkiConnect is accessible at http://localhost:8765"
                ]
            },
            { status: 500 }
        );
    }
};
