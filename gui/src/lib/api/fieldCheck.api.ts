// TypeScript AnkiConnect Field Checker
// Run with: npx ts-node field-checker.ts

interface AnkiConnectResponse<T = any> {
    result: T;
    error: string | null;
}

interface AnkiConnectRequest {
    action: string;
    version: number;
    params: any;
}

const DECK_NAME = "customMPV";
const NOTE_TYPE = "Refold Sentence Miner: Sentence Hidden";

class AnkiFieldChecker {
    private readonly baseUrl = "http://localhost:8765";

    private async makeRequest<T>(request: AnkiConnectRequest): Promise<T> {
        try {
            const response = await fetch(this.baseUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = (await response.json()) as AnkiConnectResponse<T>;

            if (result.error) {
                throw new Error(`AnkiConnect error: ${result.error}`);
            }

            return result.result;
        } catch (error) {
            console.error("AnkiConnect request failed:", error);
            throw error;
        }
    }

    async checkConnection(): Promise<number> {
        console.log("🔌 Checking AnkiConnect connection...");
        const version = await this.makeRequest<number>({
            action: "version",
            version: 6,
            params: {}
        });
        console.log(`✅ Connected to AnkiConnect version ${version}\n`);
        return version;
    }

    async getModelFieldNames(modelName: string): Promise<string[]> {
        console.log(`📋 Getting field names for note type: "${modelName}"`);
        const fields = await this.makeRequest<string[]>({
            action: "modelFieldNames",
            version: 6,
            params: {
                modelName: modelName
            }
        });
        return fields;
    }

    async getDeckNames(): Promise<string[]> {
        console.log("📚 Getting all deck names...");
        const decks = await this.makeRequest<string[]>({
            action: "deckNames",
            version: 6,
            params: {}
        });
        return decks;
    }

    async getModelNames(): Promise<string[]> {
        console.log("📝 Getting all note types...");
        const models = await this.makeRequest<string[]>({
            action: "modelNames",
            version: 6,
            params: {}
        });
        return models;
    }
}

export const fieldCheckerApi = new AnkiFieldChecker();

// TODO: It's now a layer between sensical API queries and the +server.ts GET, POST

async function checkAnkiInfo(): Promise<void> {
    const checker = new AnkiFieldChecker();

    try {
        // Check connection
        await checker.checkConnection();

        // Get all decks
        const allDecks = await checker.getDeckNames();
        console.log("📚 Available decks:");
        allDecks.forEach((deck, index) => {
            const marker = deck === DECK_NAME ? " ← YOUR TARGET DECK" : "";
            console.log(`   ${index + 1}. ${deck}${marker}`);
        });
        console.log();

        // Check if target deck exists
        if (!allDecks.includes(DECK_NAME)) {
            console.log(`❌ ERROR: Deck "${DECK_NAME}" not found!`);
            console.log(`   Available decks: ${allDecks.join(", ")}\n`);
        } else {
            console.log(`✅ Deck "${DECK_NAME}" exists!\n`);
        }

        // Get all note types
        const allModels = await checker.getModelNames();
        console.log("📝 Available note types:");
        allModels.forEach((model, index) => {
            const marker = model === NOTE_TYPE ? " ← YOUR TARGET NOTE TYPE" : "";
            console.log(`   ${index + 1}. ${model}${marker}`);
        });
        console.log();

        // Check if target note type exists
        if (!allModels.includes(NOTE_TYPE)) {
            console.log(`❌ ERROR: Note type "${NOTE_TYPE}" not found!`);
            console.log(`   Available note types: ${allModels.join(", ")}\n`);
        } else {
            console.log(`✅ Note type "${NOTE_TYPE}" exists!\n`);

            // Get fields for the target note type
            const fields = await checker.getModelFieldNames(NOTE_TYPE);
            console.log(`🎯 Fields in "${NOTE_TYPE}":`);
            fields.forEach((field, index) => {
                console.log(`   ${index + 1}. "${field}"`);
            });
            console.log();

            console.log("📄 Copy-paste ready field mapping:");
            console.log("fields: {");
            fields.forEach((field) => {
                console.log(`    "${field}": "your content here",`);
            });
            console.log("}");
        }
    } catch (error) {
        console.error("\n❌ FAILED to check Anki info:");
        console.error(error);
        console.log("\n🔧 Troubleshooting:");
        console.log("1. Make sure Anki is running");
        console.log("2. Install AnkiConnect addon if you haven't");
        console.log("3. Verify AnkiConnect is accessible at http://localhost:8765");
    }
}

export { AnkiFieldChecker, checkAnkiInfo };
