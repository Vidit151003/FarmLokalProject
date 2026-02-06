import { Router } from 'express';
import { WebhooksController } from './webhooks.controller';
import { asyncHandler } from '../../shared/utils/async-handler.util';

const router = Router();
const controller = new WebhooksController();

router.post('/', asyncHandler(controller.handleWebhook));

export default router;
