import axios from 'axios';
import redis from '../db/redis';
import { config } from '../config';
import { logger } from '../utils/logger';

const TOKEN_KEY = 'oauth:access_token';
const TOKEN_LOCK_KEY = 'oauth:token_lock';
const LOCK_TIMEOUT = 5; // seconds

interface TokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

// Get token from cache or fetch new one
export async function getAccessToken(): Promise<string> {
    // First try to get from cache
    const cachedToken = await redis.get(TOKEN_KEY);
    if (cachedToken) {
        logger.debug('Using cached OAuth token');
        return cachedToken;
    }

    // Token not in cache, need to fetch
    return await fetchTokenWithLock();
}

// Fetch token with lock to prevent multiple concurrent fetches
async function fetchTokenWithLock(): Promise<string> {
    // Try to acquire lock
    const lockAcquired = await redis.set(
        TOKEN_LOCK_KEY,
        'locked',
        'EX',
        LOCK_TIMEOUT,
        'NX'
    );

    if (!lockAcquired) {
        // Another request is fetching, wait and retry
        await sleep(100);
        return getAccessToken();
    }

    try {
        // Double check cache after acquiring lock
        const cachedToken = await redis.get(TOKEN_KEY);
        if (cachedToken) {
            return cachedToken;
        }

        // Fetch new token from OAuth provider
        const token = await fetchTokenFromProvider();
        return token;
    } finally {
        // Release lock
        await redis.del(TOKEN_LOCK_KEY);
    }
}

// Fetch token from OAuth provider (mock implementation)
async function fetchTokenFromProvider(): Promise<string> {
    logger.info('Fetching new OAuth token from provider');

    try {
        // In real scenario, call actual OAuth provider
        // For demo, we create a mock token
        const mockToken = generateMockToken();
        const expiresIn = 3600; // 1 hour

        // Cache token with TTL slightly less than expiry
        const cacheTTL = expiresIn - 60; // refresh 1 min before expiry
        await redis.setex(TOKEN_KEY, cacheTTL, mockToken);

        logger.info('OAuth token cached successfully');
        return mockToken;
    } catch (error) {
        logger.error('Failed to fetch OAuth token:', error);
        throw new Error('OAuth token fetch failed');
    }
}

// Generate mock token for demo
function generateMockToken(): string {
    const payload = {
        iss: 'farmlokal-auth',
        exp: Date.now() + 3600000,
        client_id: config.oauth.clientId,
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// Helper function for sleep
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Check if token is valid
export async function isTokenValid(): Promise<boolean> {
    const token = await redis.get(TOKEN_KEY);
    return token !== null;
}

// Force refresh token
export async function refreshToken(): Promise<string> {
    await redis.del(TOKEN_KEY);
    return getAccessToken();
}
