import axios, { AxiosError } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

const BASE_URL = config.externalApi.apiABaseUrl;
const TIMEOUT = 5000; // 5 seconds
const MAX_RETRIES = 3;

// Fetch data with timeout and retry logic
export async function fetchProductData(productId: number): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await makeRequest(productId);
            return response;
        } catch (error) {
            lastError = error as Error;
            logger.warn(`API A attempt ${attempt} failed: ${lastError.message}`);

            if (attempt < MAX_RETRIES) {
                const delay = calculateBackoff(attempt);
                logger.info(`Retrying in ${delay}ms...`);
                await sleep(delay);
            }
        }
    }

    throw new Error(`API A failed after ${MAX_RETRIES} retries: ${lastError?.message}`);
}

// Make actual HTTP request
async function makeRequest(productId: number): Promise<any> {
    const response = await axios.get(`${BASE_URL}/posts/${productId}`, {
        timeout: TIMEOUT,
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return response.data;
}

// Calculate exponential backoff delay
function calculateBackoff(attempt: number): number {
    // 100ms, 200ms, 400ms...
    const baseDelay = 100;
    return baseDelay * Math.pow(2, attempt - 1);
}

// Fetch multiple products
export async function fetchMultipleProducts(ids: number[]): Promise<any[]> {
    const results = [];
    for (const id of ids) {
        try {
            const data = await fetchProductData(id);
            results.push(data);
        } catch (error) {
            logger.error(`Failed to fetch product ${id}`);
        }
    }
    return results;
}

// Helper sleep function
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
