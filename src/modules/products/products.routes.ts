import { Router } from 'express';
import { ProductsController } from './products.controller';
import { asyncHandler } from '../../shared/utils/async-handler.util';

const router = Router();
const controller = new ProductsController();

router.get('/', asyncHandler(controller.listProducts));
router.get('/:id', asyncHandler(controller.getProduct));

export default router;
