import { Request, Response, NextFunction } from 'express';
import redis from '../db/redis';
import { logger } from '../utils/logger';

interface RateLimitConfig {
    windowMs: number;  // Time window in milliseconds
    maxRequests: number;  // Max requests per window
}

const DEFAULT_CONFIG: RateLimitConfig = {
    windowMs: 60000,  // 1 minute
    maxRequests: 100, // 100 requests per minute
};

// Rate limiter middleware using Redis
export function rateLimiter(config: RateLimitConfig = DEFAULT_CONFIG) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const clientId = getClientId(req);
        const key = `ratelimit:${clientId}`;

        try {
            // Get current count
            const current = await redis.get(key);
            const count = current ? parseInt(current) : 0;

            if (count >= config.maxRequests) {
                logger.warn(`Rate limit exceeded for ${clientId}`);
                return res.status(429).json({
                    error: 'Too many requests',
                    message: 'Please try again later',
                    retryAfter: Math.ceil(config.windowMs / 1000),
                });
            }

            // Increment counter
            await redis.multi()
                .incr(key)
                .pexpire(key, config.windowMs)
                .exec();

            // Add rate limit headers
            res.setHeader('X-RateLimit-Limit', config.maxRequests);
            res.setHeader('X-RateLimit-Remaining', config.maxRequests - count - 1);

            next();
        } catch (error) {
            // If Redis fails, allow request (graceful degradation)
            logger.error('Rate limiter error:', error);
            next();
        }
    };
}

// Get client identifier from request
function getClientId(req: Request): string {
    // Use IP address or API key as identifier
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const apiKey = req.headers['x-api-key'];
    return apiKey ? String(apiKey) : ip;
}
