import { Request, Response } from 'express';
import { WebhooksService } from './webhooks.service';
import { WebhookPayload } from './webhooks.types';

export class WebhooksController {
    private readonly service: WebhooksService;

    constructor() {
        this.service = new WebhooksService();
    }

    handleWebhook = async (req: Request, res: Response): Promise<void> => {
        const payload = req.body as WebhookPayload;
        const signature = req.headers['x-webhook-signature'] as string;
        const timestamp = req.headers['x-webhook-timestamp'] as string;
        const idempotencyKey = req.headers['x-idempotency-key'] as string;

        const result = await this.service.processWebhook(payload, signature, timestamp, idempotencyKey);

        if (result.duplicate) {
            res.status(200).json({
                acknowledged: true,
                message: 'Event already processed',
                requestId: req.requestId,
            });
        } else {
            res.status(202).json({
                acknowledged: true,
                message: 'Event accepted for processing',
                requestId: req.requestId,
            });
        }
    };
}
