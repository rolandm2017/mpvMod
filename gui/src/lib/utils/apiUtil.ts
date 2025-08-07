interface AnkiConnectResponse<T = any> {
    result: T;
    error: string | null;
}

interface AnkiConnectRequest {
    action: string;
    version: number;
    params: any;
}

const ANKI_CONNECT_URL = "http://localhost:8765";

async function makeAnkiRequest<T>(request: AnkiConnectRequest): Promise<T> {
    try {
        const response = await fetch(ANKI_CONNECT_URL, {
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
            if (result.error.includes("empty")) {
                throw new Error(`EMPTY_NOTE: ${result.error}`);
            }
            throw new Error(`AnkiConnect error: ${result.error}`);
        }

        return result.result;
    } catch (error) {
        console.error("AnkiConnect request failed:", error);
        throw error;
    }
}

export { makeAnkiRequest };
