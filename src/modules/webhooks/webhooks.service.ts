import { WebhooksRepository } from './webhooks.repository';
import { CacheService } from '../../core/cache/cache.service';
import { verifyHMACSignature, isTimestampValid } from '../../shared/utils/crypto.utils';
import { config } from '../../config/environment';
import { WebhookPayload } from './webhooks.types';
import { AuthenticationError } from '../../shared/errors/app.error';
import { logger } from '../../observability/logger';

export class WebhooksService {
    private readonly repository: WebhooksRepository;
    private readonly cacheService: CacheService;

    constructor() {
        this.repository = new WebhooksRepository();
        this.cacheService = new CacheService('idempotency');
    }

    async processWebhook(
        payload: WebhookPayload,
        signature: string,
        timestamp: string,
        idempotencyKey: string
    ): Promise<{ acknowledged: boolean; duplicate: boolean }> {
        this.verifySignature(JSON.stringify(payload), signature);
        this.verifyTimestamp(parseInt(timestamp, 10));

        const isDuplicate = await this.checkIdempotency(idempotencyKey);

        if (isDuplicate) {
            logger.info({ idempotencyKey }, 'Duplicate webhook event detected');
            return { acknowledged: true, duplicate: true };
        }

        await this.repository.create(idempotencyKey, payload.eventType, payload.data);
        await this.cacheService.set(idempotencyKey, true, 86400);

        logger.info({ idempotencyKey, eventType: payload.eventType }, 'Webhook event stored');

        return { acknowledged: true, duplicate: false };
    }

    private verifySignature(payload: string, signature: string): void {
        const isValid = verifyHMACSignature(payload, signature, config.WEBHOOK_SECRET);

        if (!isValid) {
            throw new AuthenticationError('Invalid webhook signature');
        }
    }

    private verifyTimestamp(timestamp: number): void {
        const isValid = isTimestampValid(timestamp, config.WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS);

        if (!isValid) {
            throw new AuthenticationError('Webhook timestamp out of tolerance');
        }
    }

    private async checkIdempotency(idempotencyKey: string): Promise<boolean> {
        const cachedResult = await this.cacheService.exists(idempotencyKey);

        if (cachedResult) {
            return true;
        }

        const existingEvent = await this.repository.findByIdempotencyKey(idempotencyKey);
        return existingEvent !== null;
    }
}
