import { Request, Response } from 'express';
import { ProductsService } from './products.service';
import { productListQuerySchema } from './products.validation';
import { ApiResponse } from '../../shared/types/pagination.types';
import { ProductWithRelations, ProductListResult } from './products.types';
import { httpRequestsTotal, httpRequestDurationSeconds } from '../../observability/metrics';

export class ProductsController {
    private readonly service: ProductsService;

    constructor() {
        this.service = new ProductsService();
    }

    listProducts = async (req: Request, res: Response): Promise<void> => {
        const timer = httpRequestDurationSeconds.startTimer({ method: req.method, path: '/api/v1/products' });

        try {
            const params = productListQuerySchema.parse(req.query);
            const result: ProductListResult = await this.service.getProducts(params);

            const response: ApiResponse<ProductWithRelations[]> = {
                data: result.products,
                pagination: {
                    nextCursor: result.nextCursor,
                    hasMore: result.hasMore,
                    totalCount: result.totalCount,
                },
                meta: {
                    requestId: req.requestId,
                    timestamp: new Date().toISOString(),
                },
            };

            httpRequestsTotal.inc({ method: req.method, path: '/api/v1/products', status: '200' });
            timer({ status: '200' });

            res.status(200).json(response);
        } catch (error) {
            httpRequestsTotal.inc({ method: req.method, path: '/api/v1/products', status: '500' });
            timer({ status: '500' });
            throw error;
        }
    };

    getProduct = async (req: Request, res: Response): Promise<void> => {
        const timer = httpRequestDurationSeconds.startTimer({ method: req.method, path: '/api/v1/products/:id' });

        try {
            const { id } = req.params;
            const product = await this.service.getProductById(id);

            const response: ApiResponse<ProductWithRelations> = {
                data: product,
                meta: {
                    requestId: req.requestId,
                    timestamp: new Date().toISOString(),
                },
            };

            httpRequestsTotal.inc({ method: req.method, path: '/api/v1/products/:id', status: '200' });
            timer({ status: '200' });

            res.status(200).json(response);
        } catch (error) {
            httpRequestsTotal.inc({ method: req.method, path: '/api/v1/products/:id', status: '404' });
            timer({ status: '404' });
            throw error;
        }
    };
}
