import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

// Create Redis client
const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    retryStrategy: (times) => {
        // Retry connection with increasing delay
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
});

// Handle connection events
redis.on('connect', () => {
    logger.info('Redis connected successfully');
});

redis.on('error', (err) => {
    logger.error('Redis connection error:', err);
});

export default redis;
