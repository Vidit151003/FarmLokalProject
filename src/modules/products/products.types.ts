export interface Product {
    id: string;
    categoryId: string;
    producerId: string;
    name: string;
    description: string | null;
    price: number;
    unit: string;
    stockQuantity: number;
    isActive: boolean;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProductWithRelations extends Product {
    category: {
        id: string;
        name: string;
    };
    producer: {
        id: string;
        name: string;
    };
}

export interface ProductListParams {
    limit: number;
    cursor?: string;
    sort?: 'price' | 'name' | 'created_at';
    order?: 'asc' | 'desc';
    search?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
}

export interface ProductListResult {
    products: ProductWithRelations[];
    nextCursor: string | null;
    hasMore: boolean;
    totalCount?: number;
}
