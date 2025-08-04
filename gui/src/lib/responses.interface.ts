export interface GetDecksSuccessResponse {
    success: true;
    decks: string[];
    targetDeck: string;
    targetDeckExists: boolean;
    message: string;
}

export interface GetDecksErrorResponse {
    success: false;
    error: string;
}

export type GetDecksResponse = GetDecksSuccessResponse | GetDecksErrorResponse;

//

export interface GetNoteTypesSuccessResponse {
    success: true;
    noteTypes: string[];
    targetNoteType: string;
    targetNoteTypeExists: boolean;
    message: string;
}

export interface GetNoteTypesErrorResponse {
    success: false;
    error: string;
}

export type GetNoteTypesResponse = GetNoteTypesSuccessResponse | GetNoteTypesErrorResponse;
