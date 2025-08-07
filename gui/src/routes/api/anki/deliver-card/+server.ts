// routes/api/anki/deliver-card/+server.ts
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { makeAnkiRequest } from "$lib/utils/apiUtil";

const TARGET_DECK = "customMPV"; // You can make this configurable

export const POST: RequestHandler = async ({ request, url }) => {
    try {
        // Get data from request body
        const cardData = await request.json();

        // Or still use URL params as fallback
        const targetDeck = cardData.targetDeck || url.searchParams.get("target") || TARGET_DECK;

        // Your existing logic...

        return json({
            success: true,
            cardData,
            targetDeck,
            message: targetDeck ? `Target deck "${targetDeck}" found!` : `Target deck "${targetDeck}" not found`
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
