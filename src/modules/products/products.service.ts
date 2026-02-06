import { ProductsRepository } from './products.repository';
import { CacheService } from '../../core/cache/cache.service';
import { generateCacheKey } from '../../core/cache/cache.keys';
import { ProductWithRelations, ProductListParams, ProductListResult } from './products.types';
import { encodeCursor } from '../../shared/utils/cursor.utils';
import { config } from '../../config/environment';
import { NotFoundError } from '../../shared/errors/app.error';

export class ProductsService {
    private readonly repository: ProductsRepository;
    private readonly cacheService: CacheService;

    constructor() {
        this.repository = new ProductsRepository();
        this.cacheService = new CacheService('cache:products');
    }

    // Implements cursor-based pagination with caching
    async getProducts(params: ProductListParams): Promise<ProductListResult> {
        const cacheKey = generateCacheKey(params as any);
        const cached = await this.cacheService.get<ProductListResult>(cacheKey);

        if (cached) {
            return cached;
        }

        const { products, hasMore } = await this.repository.findAll(params);

        const nextCursor =
            hasMore && products.length > 0
                ? encodeCursor({
                    sortValue: String(products[products.length - 1][this.getSortField(params.sort || 'created_at')]),
                    id: products[products.length - 1].id,
                })
                : null;

        const result: ProductListResult = {
            products,
            nextCursor,
            hasMore,
        };

        await this.cacheService.set(cacheKey, result, config.CACHE_PRODUCT_LIST_TTL);

        return result;
    }

    async getProductById(id: string): Promise<ProductWithRelations> {
        const cacheKey = id;
        const cached = await this.cacheService.get<ProductWithRelations>(cacheKey);

        if (cached) {
            return cached;
        }

        const product = await this.repository.findById(id);

        if (!product) {
            throw new NotFoundError('Product');
        }

        await this.cacheService.set(cacheKey, product, config.CACHE_PRODUCT_ITEM_TTL);

        return product;
    }

    async invalidateProductCache(productId?: string): Promise<void> {
        if (productId) {
            await this.cacheService.delete(productId);
        }
        await this.cacheService.deletePattern('*');
    }

    private getSortField(sort: string): keyof ProductWithRelations {
        const fieldMap: Record<string, keyof ProductWithRelations> = {
            price: 'price',
            name: 'name',
            created_at: 'createdAt',
        };
        return fieldMap[sort] || 'createdAt';
    }
}
