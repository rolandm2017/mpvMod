// routes/api/anki/fields/+server.ts
// Get field names for a specific note type
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

// ... (copy the makeAnkiRequest function and interfaces from above)

export const GET: RequestHandler = async ({ url }) => {
    const modelName = url.searchParams.get("model");

    if (!modelName) {
        return json(
            {
                success: false,
                error: "Missing required parameter: model"
            },
            { status: 400 }
        );
    }

    try {
        const fields = await makeAnkiRequest<string[]>({
            action: "modelFieldNames",
            version: 6,
            params: {
                modelName: modelName
            }
        });

        // Generate copy-paste ready field mapping
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
            fieldMapping,
            copyPasteReady: `fields: {\n${fields.map((field) => `    "${field}": "your content here",`).join("\n")}\n}`
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
