// routes/api/anki/note-types/+server.ts
// Get all available note types (models)
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { makeAnkiRequest } from "$lib/utils/apiUtil";

// ... (copy the makeAnkiRequest function and interfaces from above)

const TARGET_NOTE_TYPE = "Refold Sentence Miner: Sentence Hidden";

export const GET: RequestHandler = async ({ url }) => {
    try {
        const noteTypes = await makeAnkiRequest<string[]>({
            action: "modelNames",
            version: 6,
            params: {}
        });

        const targetNoteType = url.searchParams.get("target") || TARGET_NOTE_TYPE;
        const noteTypeExists = noteTypes.includes(targetNoteType);

        return json({
            success: true,
            noteTypes,
            targetNoteType,
            targetNoteTypeExists: noteTypeExists,
            message: noteTypeExists
                ? `Target note type "${targetNoteType}" found!`
                : `Target note type "${targetNoteType}" not found`
        });
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
