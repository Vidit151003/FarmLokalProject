import { z } from 'zod';

export const productListQuerySchema = z.object({
    limit: z
        .string()
        .optional()
        .default('20')
        .transform((val) => parseInt(val, 10))
        .pipe(z.number().min(1).max(100)),
    cursor: z.string().optional(),
    sort: z.enum(['price', 'name', 'created_at']).optional().default('created_at'),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
    search: z.string().min(2).optional(),
    category: z.string().uuid().optional(),
    minPrice: z
        .string()
        .optional()
        .transform((val) => (val ? parseFloat(val) : undefined))
        .pipe(z.number().min(0).optional()),
    maxPrice: z
        .string()
        .optional()
        .transform((val) => (val ? parseFloat(val) : undefined))
        .pipe(z.number().min(0).optional()),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;
