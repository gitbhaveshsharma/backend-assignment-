import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as productService from '../services/product.service';
import { ProductFilters, PaginationOptions } from '../types/product.types';

const router = Router();

// GET /products - List products with pagination, filtering, sorting
router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        // Parse query parameters
        const filters = parseFilters(req);
        const pagination = parsePagination(req);

        // Get products from service
        const result = await productService.getProducts(filters, pagination);

        res.json({
            success: true,
            ...result,
        });
    })
);

// GET /products/:id - Get single product
router.get(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid product ID',
            });
        }

        const product = await productService.getProductById(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found',
            });
        }

        res.json({
            success: true,
            data: product,
        });
    })
);

// Parse filter parameters from request
function parseFilters(req: Request): ProductFilters {
    return {
        category: req.query.category as string,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        search: req.query.search as string,
    };
}

// Parse pagination parameters from request
function parsePagination(req: Request): PaginationOptions {
    const validSortFields = ['price', 'created_at', 'name'];
    const sortBy = validSortFields.includes(req.query.sortBy as string)
        ? (req.query.sortBy as 'price' | 'created_at' | 'name')
        : 'created_at';

    return {
        cursor: req.query.cursor as string,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
        sortBy,
        sortOrder: req.query.sortOrder === 'asc' ? 'asc' : 'desc',
    };
}

export default router;
