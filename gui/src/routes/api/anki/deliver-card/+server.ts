// routes/api/anki/deliver-card/+server.ts
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { makeAnkiRequest } from "../../../../lib/utils/apiUtil";

export const POST: RequestHandler = async ({ request }) => {
    try {
        // Get the AnkiConnect payload from your client
        const ankiPayload = await request.json();

        console.log("Received payload:", JSON.stringify(ankiPayload, null, 2));

        // Forward the payload directly to AnkiConnect
        const ankiResponse = await makeAnkiRequest<number>(ankiPayload);

        console.log("AnkiConnect response:", ankiResponse);

        // Return success with the note ID
        return json({
            success: true,
            result: ankiResponse, // This will be the note ID
            message: `Card created successfully with ID: ${ankiResponse}`
        });
    } catch (error) {
        console.error("Error delivering card to Anki:", error);

        return json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
                result: null
            },
            { status: 500 }
        );
    }
};
