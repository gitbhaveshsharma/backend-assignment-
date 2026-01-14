import { logger } from '../utils/logger';

interface CircuitBreakerConfig {
    failureThreshold: number;  // Number of failures before opening
    successThreshold: number;  // Successes needed to close
    timeout: number;           // Time in ms before trying again
}

enum CircuitState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    HALF_OPEN = 'HALF_OPEN',
}

// Simple circuit breaker implementation
export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failures: number = 0;
    private successes: number = 0;
    private lastFailureTime: number = 0;
    private config: CircuitBreakerConfig;

    constructor(config: Partial<CircuitBreakerConfig> = {}) {
        this.config = {
            failureThreshold: config.failureThreshold || 5,
            successThreshold: config.successThreshold || 2,
            timeout: config.timeout || 30000, // 30 seconds
        };
    }

    // Execute function with circuit breaker
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === CircuitState.OPEN) {
            if (this.shouldAttemptReset()) {
                this.state = CircuitState.HALF_OPEN;
                logger.info('Circuit breaker: HALF_OPEN');
            } else {
                throw new Error('Circuit breaker is OPEN');
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    // Handle successful execution
    private onSuccess(): void {
        this.failures = 0;

        if (this.state === CircuitState.HALF_OPEN) {
            this.successes++;
            if (this.successes >= this.config.successThreshold) {
                this.state = CircuitState.CLOSED;
                this.successes = 0;
                logger.info('Circuit breaker: CLOSED');
            }
        }
    }

    // Handle failed execution
    private onFailure(): void {
        this.failures++;
        this.lastFailureTime = Date.now();
        this.successes = 0;

        if (this.failures >= this.config.failureThreshold) {
            this.state = CircuitState.OPEN;
            logger.warn('Circuit breaker: OPEN');
        }
    }

    // Check if we should try to reset
    private shouldAttemptReset(): boolean {
        return Date.now() - this.lastFailureTime >= this.config.timeout;
    }

    // Get current state
    getState(): CircuitState {
        return this.state;
    }
}

// Create default circuit breaker instance
export const defaultCircuitBreaker = new CircuitBreaker();
