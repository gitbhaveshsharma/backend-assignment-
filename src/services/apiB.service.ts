import redis from '../db/redis';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const PROCESSED_EVENTS_KEY = 'webhook:processed_events';
const EVENT_TTL = 86400; // 24 hours

interface WebhookEvent {
    eventId: string;
    type: string;
    data: any;
    timestamp: number;
}

// Store pending callbacks waiting for webhook response
const pendingCallbacks = new Map<string, (data: any) => void>();

// Register a callback for async webhook response
export function registerCallback(callbackId: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            pendingCallbacks.delete(callbackId);
            reject(new Error('Webhook callback timeout'));
        }, 30000); // 30 second timeout

        pendingCallbacks.set(callbackId, (data) => {
            clearTimeout(timeout);
            pendingCallbacks.delete(callbackId);
            resolve(data);
        });
    });
}

// Process incoming webhook event
export async function processWebhookEvent(event: WebhookEvent): Promise<boolean> {
    const { eventId } = event;

    // Check for duplicate event (idempotency)
    const isDuplicate = await isEventProcessed(eventId);
    if (isDuplicate) {
        logger.warn(`Duplicate webhook event ignored: ${eventId}`);
        return false;
    }

    // Mark event as processed
    await markEventProcessed(eventId);

    // Handle the event based on type
    await handleEvent(event);
    logger.info(`Webhook event processed: ${eventId}`);
    return true;
}

// Check if event was already processed
async function isEventProcessed(eventId: string): Promise<boolean> {
    const result = await redis.sismember(PROCESSED_EVENTS_KEY, eventId);
    return result === 1;
}

// Mark event as processed in Redis
async function markEventProcessed(eventId: string): Promise<void> {
    await redis.sadd(PROCESSED_EVENTS_KEY, eventId);
    // Set expiry on the set (cleanup old events)
    await redis.expire(PROCESSED_EVENTS_KEY, EVENT_TTL);
}

// Handle different event types
async function handleEvent(event: WebhookEvent): Promise<void> {
    const { type, data, eventId } = event;

    switch (type) {
        case 'order.completed':
            logger.info(`Order completed: ${data.orderId}`);
            break;
        case 'product.updated':
            logger.info(`Product updated: ${data.productId}`);
            break;
        case 'callback.response':
            // Resolve pending callback
            const callback = pendingCallbacks.get(data.callbackId);
            if (callback) {
                callback(data);
            }
            break;
        default:
            logger.warn(`Unknown event type: ${type}`);
    }
}

// Generate unique event ID
export function generateEventId(): string {
    return uuidv4();
}
