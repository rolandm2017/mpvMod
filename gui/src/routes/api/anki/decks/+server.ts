// routes/api/anki/decks/+server.ts
// Get all available deck names
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { makeAnkiRequest } from "$lib/utils/apiUtil";

// ... (copy the makeAnkiRequest function and interfaces from above)

const TARGET_DECK = "customMPV"; // You can make this configurable

export const GET: RequestHandler = async ({ url }) => {
    try {
        const decks = await makeAnkiRequest<string[]>({
            action: "deckNames",
            version: 6,
            params: {}
        });

        const targetDeck = url.searchParams.get("target") || TARGET_DECK;
        const deckExists = decks.includes(targetDeck);

        return json({
            success: true,
            decks,
            targetDeck,
            targetDeckExists: deckExists,
            message: deckExists ? `Target deck "${targetDeck}" found!` : `Target deck "${targetDeck}" not found`
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
