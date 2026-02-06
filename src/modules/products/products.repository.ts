import { getDatabasePool } from '../../config/database';
import { RowDataPacket } from 'mysql2';
import { ProductWithRelations, ProductListParams } from './products.types';
import { decodeCursor } from '../../shared/utils/cursor.utils';
import { logger } from '../../observability/logger';
import { databaseQueryDurationSeconds } from '../../observability/metrics';

interface ProductRow extends RowDataPacket {
    id: string;
    category_id: string;
    producer_id: string;
    name: string;
    description: string | null;
    price: string;
    unit: string;
    stock_quantity: number;
    is_active: number;
    metadata: string | null;
    created_at: Date;
    updated_at: Date;
    category_name: string;
    producer_name: string;
}

export class ProductsRepository {
    async findAll(params: ProductListParams): Promise<{
        products: ProductWithRelations[];
        hasMore: boolean;
    }> {
        const timer = databaseQueryDurationSeconds.startTimer({ operation: 'select', table: 'products' });

        try {
            const { limit, cursor, sort = 'created_at', order = 'desc', search, category, minPrice, maxPrice } = params;

            let whereConditions: string[] = ['p.is_active = 1'];
            const queryParams: (string | number)[] = [];

            if (search) {
                whereConditions.push('MATCH(p.name, p.description) AGAINST(? IN NATURAL LANGUAGE MODE)');
                queryParams.push(search);
            }

            if (category) {
                whereConditions.push('p.category_id = ?');
                queryParams.push(category);
            }

            if (minPrice !== undefined) {
                whereConditions.push('p.price >= ?');
                queryParams.push(minPrice);
            }

            if (maxPrice !== undefined) {
                whereConditions.push('p.price <= ?');
                queryParams.push(maxPrice);
            }

            if (cursor) {
                const cursorData = decodeCursor(cursor);
                const { sortValue, id } = cursorData;

                if (order === 'desc') {
                    whereConditions.push(`(p.${sort} < ? OR (p.${sort} = ? AND p.id < ?))`);
                    queryParams.push(sortValue, sortValue, id);
                } else {
                    whereConditions.push(`(p.${sort} > ? OR (p.${sort} = ? AND p.id > ?))`);
                    queryParams.push(sortValue, sortValue, id);
                }
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            const query = `
        SELECT 
          p.id, p.category_id, p.producer_id, p.name, p.description,
          p.price, p.unit, p.stock_quantity, p.is_active, p.metadata,
          p.created_at, p.updated_at,
          c.name AS category_name,
          pr.name AS producer_name
        FROM products p
        INNER JOIN categories c ON p.category_id = c.id
        INNER JOIN producers pr ON p.producer_id = pr.id
        ${whereClause}
        ORDER BY p.${sort} ${order.toUpperCase()}, p.id ${order.toUpperCase()}
        LIMIT ?
      `;

            queryParams.push(limit + 1);

            const pool = getDatabasePool();
            const [rows] = await pool.query<ProductRow[]>(query, queryParams);

            const hasMore = rows.length > limit;
            const products = rows.slice(0, limit).map(this.mapRowToProduct);

            timer();
            return { products, hasMore };
        } catch (error) {
            timer();
            logger.error({ error, params }, 'Product repository findAll error');
            throw error;
        }
    }

    async findById(id: string): Promise<ProductWithRelations | null> {
        const timer = databaseQueryDurationSeconds.startTimer({ operation: 'select', table: 'products' });

        try {
            const query = `
        SELECT 
          p.id, p.category_id, p.producer_id, p.name, p.description,
          p.price, p.unit, p.stock_quantity, p.is_active, p.metadata,
          p.created_at, p.updated_at,
          c.name AS category_name,
          pr.name AS producer_name
        FROM products p
        INNER JOIN categories c ON p.category_id = c.id
        INNER JOIN producers pr ON p.producer_id = pr.id
        WHERE p.id = ?
      `;

            const pool = getDatabasePool();
            const [rows] = await pool.query<ProductRow[]>(query, [id]);

            timer();

            if (rows.length === 0) {
                return null;
            }

            return this.mapRowToProduct(rows[0]);
        } catch (error) {
            timer();
            logger.error({ error, id }, 'Product repository findById error');
            throw error;
        }
    }

    private mapRowToProduct(row: ProductRow): ProductWithRelations {
        return {
            id: row.id,
            categoryId: row.category_id,
            producerId: row.producer_id,
            name: row.name,
            description: row.description,
            price: parseFloat(row.price),
            unit: row.unit,
            stockQuantity: row.stock_quantity,
            isActive: row.is_active === 1,
            metadata: row.metadata ? JSON.parse(row.metadata) : null,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            category: {
                id: row.category_id,
                name: row.category_name,
            },
            producer: {
                id: row.producer_id,
                name: row.producer_name,
            },
        };
    }
}
