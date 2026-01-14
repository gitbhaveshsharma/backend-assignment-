import pool from '../db/mysql';
import redis from '../db/redis';
import { logger } from '../utils/logger';
import {
    Product,
    ProductFilters,
    PaginationOptions,
    PaginatedResponse,
} from '../types/product.types';

const CACHE_TTL = 300; // 5 minutes cache
const CACHE_PREFIX = 'products:';

// Get products with pagination, filtering and caching
export async function getProducts(
    filters: ProductFilters,
    pagination: PaginationOptions
): Promise<PaginatedResponse<Product>> {
    // Generate cache key based on query params
    const cacheKey = generateCacheKey(filters, pagination);

    // Try to get from cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
        logger.debug('Cache hit for products query');
        return JSON.parse(cached);
    }

    // Cache miss - query database
    logger.debug('Cache miss - querying database');
    const result = await queryProducts(filters, pagination);

    // Store in cache
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));

    return result;
}

// Generate unique cache key for query
function generateCacheKey(
    filters: ProductFilters,
    pagination: PaginationOptions
): string {
    const filterPart = JSON.stringify(filters);
    const paginationPart = JSON.stringify(pagination);
    return `${CACHE_PREFIX}${Buffer.from(filterPart + paginationPart).toString('base64')}`;
}

// Query products from database
async function queryProducts(
    filters: ProductFilters,
    pagination: PaginationOptions
): Promise<PaginatedResponse<Product>> {
    const { cursor, limit, sortBy, sortOrder } = pagination;
    const params: any[] = [];

    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    whereClause += buildFilterClause(filters, params);

    // Add cursor condition for pagination
    if (cursor) {
        const decodedCursor = decodeCursor(cursor);
        whereClause += ` AND (${sortBy}, id) ${sortOrder === 'asc' ? '>' : '<'} (?, ?)`;
        params.push(decodedCursor.value, decodedCursor.id);
    }

    // Build ORDER BY clause
    const orderClause = `ORDER BY ${sortBy} ${sortOrder}, id ${sortOrder}`;

    // Query with limit + 1 to check if more exist
    const query = `
    SELECT id, name, description, price, category, stock, created_at, updated_at
    FROM products
    ${whereClause}
    ${orderClause}
    LIMIT ?
  `;
    params.push(limit + 1);

    const [rows] = await pool.execute(query, params);
    const products = rows as Product[];

    // Check if there are more results
    const hasMore = products.length > limit;
    if (hasMore) {
        products.pop(); // Remove extra item
    }

    // Generate next cursor
    const nextCursor = hasMore ? encodeCursor(products[products.length - 1], sortBy) : null;

    return {
        data: products,
        nextCursor,
        hasMore,
    };
}

// Build filter SQL clause
function buildFilterClause(filters: ProductFilters, params: any[]): string {
    let clause = '';

    if (filters.category) {
        clause += ' AND category = ?';
        params.push(filters.category);
    }

    if (filters.minPrice !== undefined) {
        clause += ' AND price >= ?';
        params.push(filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
        clause += ' AND price <= ?';
        params.push(filters.maxPrice);
    }

    if (filters.search) {
        clause += ' AND (name LIKE ? OR description LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
    }

    return clause;
}

// Encode cursor for pagination
function encodeCursor(product: Product, sortBy: string): string {
    const cursorData = {
        id: product.id,
        value: product[sortBy as keyof Product],
    };
    return Buffer.from(JSON.stringify(cursorData)).toString('base64');
}

// Decode cursor
function decodeCursor(cursor: string): { id: number; value: any } {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
}

// Get single product by ID
export async function getProductById(id: number): Promise<Product | null> {
    const cacheKey = `${CACHE_PREFIX}single:${id}`;

    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    // Query database
    const [rows] = await pool.execute(
        'SELECT * FROM products WHERE id = ?',
        [id]
    );

    const products = rows as Product[];
    if (products.length === 0) {
        return null;
    }

    // Cache result
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(products[0]));
    return products[0];
}

// Invalidate cache for a product
export async function invalidateProductCache(id?: number): Promise<void> {
    if (id) {
        await redis.del(`${CACHE_PREFIX}single:${id}`);
    }

    // Clear list caches (pattern-based delete)
    const keys = await redis.keys(`${CACHE_PREFIX}*`);
    if (keys.length > 0) {
        await redis.del(...keys);
    }
    logger.info('Product cache invalidated');
}
