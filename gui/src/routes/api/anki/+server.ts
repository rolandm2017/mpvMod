// routes/api/anki/+server.ts
// Alternative: Single route with action parameter
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

// ... (copy the makeAnkiRequest function and interfaces from above)

export const GET: RequestHandler = async ({ url }) => {
    const action = url.searchParams.get("action");
    const modelName = url.searchParams.get("model");
    const targetDeck = url.searchParams.get("targetDeck") || "customMPV";
    const targetNoteType = url.searchParams.get("targetNoteType") || "Refold Sentence Miner: Sentence Hidden";

    try {
        switch (action) {
            case "version": {
                const version = await makeAnkiRequest<number>({
                    action: "version",
                    version: 6,
                    params: {}
                });
                return json({ success: true, version });
            }

            case "decks": {
                const decks = await makeAnkiRequest<string[]>({
                    action: "deckNames",
                    version: 6,
                    params: {}
                });
                const deckExists = decks.includes(targetDeck);
                return json({
                    success: true,
                    decks,
                    targetDeck,
                    targetDeckExists: deckExists
                });
            }

            case "noteTypes": {
                const noteTypes = await makeAnkiRequest<string[]>({
                    action: "modelNames",
                    version: 6,
                    params: {}
                });
                const noteTypeExists = noteTypes.includes(targetNoteType);
                return json({
                    success: true,
                    noteTypes,
                    targetNoteType,
                    targetNoteTypeExists: noteTypeExists
                });
            }

            case "fields": {
                if (!modelName) {
                    return json(
                        {
                            success: false,
                            error: "Missing required parameter: model"
                        },
                        { status: 400 }
                    );
                }

                const fields = await makeAnkiRequest<string[]>({
                    action: "modelFieldNames",
                    version: 6,
                    params: { modelName }
                });

                const fieldMapping = fields.reduce(
                    (acc, field) => {
                        acc[field] = "your content here";
                        return acc;
                    },
                    {} as Record<string, string>
                );

                return json({
                    success: true,
                    modelName,
                    fields,
                    fieldMapping
                });
            }

            default:
                return json(
                    {
                        success: false,
                        error: "Invalid action. Available actions: version, decks, noteTypes, fields"
                    },
                    { status: 400 }
                );
        }
    } catch (error) {
        return json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
};
