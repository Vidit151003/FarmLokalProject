import { getDatabasePool } from '../../config/database';
import { WebhookEvent } from './webhooks.types';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface WebhookRow extends RowDataPacket {
    id: string;
    idempotency_key: string;
    event_type: string;
    payload: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    attempts: number;
    last_error: string | null;
    processed_at: Date | null;
    created_at: Date;
}

export class WebhooksRepository {
    async create(
        idempotencyKey: string,
        eventType: string,
        payload: Record<string, unknown>
    ): Promise<WebhookEvent> {
        const id = uuidv4();
        const query = `
      INSERT INTO webhook_events (id, idempotency_key, event_type, payload, status, attempts)
      VALUES (?, ?, ?, ?, 'pending', 0)
    `;

        const pool = getDatabasePool();
        await pool.execute<ResultSetHeader>(query, [
            id,
            idempotencyKey,
            eventType,
            JSON.stringify(payload),
        ]);

        return {
            id,
            idempotencyKey,
            eventType,
            payload,
            status: 'pending',
            attempts: 0,
            lastError: null,
            processedAt: null,
            createdAt: new Date(),
        };
    }

    async findByIdempotencyKey(idempotencyKey: string): Promise<WebhookEvent | null> {
        const query = `
      SELECT id, idempotency_key, event_type, payload, status, attempts, 
             last_error, processed_at, created_at
      FROM webhook_events
      WHERE idempotency_key = ?
    `;

        const pool = getDatabasePool();
        const [rows] = await pool.execute<WebhookRow[]>(query, [idempotencyKey]);

        if (rows.length === 0) {
            return null;
        }

        return this.mapRowToWebhookEvent(rows[0]);
    }

    private mapRowToWebhookEvent(row: WebhookRow): WebhookEvent {
        return {
            id: row.id,
            idempotencyKey: row.idempotency_key,
            eventType: row.event_type,
            payload: JSON.parse(row.payload),
            status: row.status,
            attempts: row.attempts,
            lastError: row.last_error,
            processedAt: row.processed_at,
            createdAt: row.created_at,
        };
    }
}
