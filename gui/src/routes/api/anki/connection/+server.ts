// routes/api/anki/connection/+server.ts
// Check AnkiConnect connection and version
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
    try {
        const version = await makeAnkiRequest<number>({
            action: "version",
            version: 6,
            params: {}
        });

        return json({
            success: true,
            version,
            message: `Connected to AnkiConnect version ${version}`
        });
    } catch (error) {
        return json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
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
