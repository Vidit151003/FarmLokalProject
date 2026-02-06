export interface WebhookEvent {
    id: string;
    idempotencyKey: string;
    eventType: string;
    payload: Record<string, unknown>;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    attempts: number;
    lastError: string | null;
    processedAt: Date | null;
    createdAt: Date;
}

export interface WebhookPayload {
    eventType: string;
    data: Record<string, unknown>;
    timestamp: number;
}

export interface WebhookHeaders {
    'x-webhook-signature': string;
    'x-webhook-timestamp': string;
    'x-idempotency-key': string;
}
