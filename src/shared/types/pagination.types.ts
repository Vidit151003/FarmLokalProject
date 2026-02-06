export interface PaginationParams {
    limit: number;
    cursor?: string;
}

export interface PaginationMeta {
    nextCursor: string | null;
    hasMore: boolean;
    totalCount?: number;
}

export interface CursorData {
    sortValue: string | number;
    id: string;
}

export interface ApiResponse<T> {
    data: T;
    pagination?: PaginationMeta;
    meta: {
        requestId: string;
        timestamp: string;
    };
}

export interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: unknown;
        requestId: string;
    };
}
