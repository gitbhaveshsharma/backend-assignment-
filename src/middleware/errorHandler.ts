import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Custom error class for API errors
export class ApiError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(statusCode: number, message: string, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

// Not found error handler
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
    const error = new ApiError(404, `Route ${req.originalUrl} not found`);
    next(error);
}

// Global error handler middleware
export function errorHandler(
    err: Error | ApiError,
    req: Request,
    res: Response,
    next: NextFunction
) {
    // Log the error
    logger.error(`Error: ${err.message}`, {
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    // Determine status code
    const statusCode = 'statusCode' in err ? err.statusCode : 500;

    // Send error response
    res.status(statusCode).json({
        success: false,
        error: {
            message: err.message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        },
    });
}

// Async handler wrapper to catch errors
export function asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
