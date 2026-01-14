// Product interface definition
export interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    category: string;
    stock: number;
    created_at: Date;
    updated_at: Date;
}

// Query filters interface
export interface ProductFilters {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
}

// Pagination options
export interface PaginationOptions {
    cursor?: string;
    limit: number;
    sortBy: 'price' | 'created_at' | 'name';
    sortOrder: 'asc' | 'desc';
}

// Paginated response
export interface PaginatedResponse<T> {
    data: T[];
    nextCursor: string | null;
    hasMore: boolean;
    totalCount?: number;
}
