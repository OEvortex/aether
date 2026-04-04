/*---------------------------------------------------------------------------------------------
 *  Rate Limiter
 *  Provides a simple rate limiting mechanism with automatic retry on 429 errors
 *--------------------------------------------------------------------------------------------*/

import { Logger } from './logger';
import { RetryManager } from './retryManager';

/**
 * Rate Limiter class
 * Implements a simple token bucket or fixed window rate limiting with automatic retry
 */
export class RateLimiter {
    private static instances = new Map<string, RateLimiter>();
    private lastRequestTime = 0;
    private requestCount = 0;
    private readonly maxRequests: number;
    private readonly windowMs: number;
    private readonly retryManager: RetryManager;

    private constructor(maxRequests = 2, windowMs = 1000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.retryManager = new RetryManager({
            maxAttempts: 5,
            initialDelayMs: 2000,
            maxDelayMs: 60000,
            backoffMultiplier: 2,
            jitterEnabled: true
        });
    }

    /**
     * Get or create a RateLimiter instance for a specific key
     * @param key Unique key for the rate limiter (e.g., provider name)
     * @param maxRequests Maximum requests allowed in the window
     * @param windowMs Window duration in milliseconds
     */
    static getInstance(
        key: string,
        maxRequests = 2,
        windowMs = 1000
    ): RateLimiter {
        let instance = RateLimiter.instances.get(key);
        if (!instance) {
            instance = new RateLimiter(maxRequests, windowMs);
            RateLimiter.instances.set(key, instance);
        }
        return instance;
    }

    /**
     * Wait if necessary to comply with rate limits
     * @param providerName Name of the provider for logging
     */
    async throttle(providerName: string): Promise<void> {
        const now = Date.now();
        const timeSinceLastWindow = now - this.lastRequestTime;

        if (timeSinceLastWindow >= this.windowMs) {
            // Reset window
            this.lastRequestTime = now;
            this.requestCount = 1;
            return;
        }

        if (this.requestCount < this.maxRequests) {
            // Still within limit for current window
            this.requestCount++;
            return;
        }

        // Limit reached, wait for next window
        const waitTime = this.windowMs - timeSinceLastWindow;
        Logger.info(
            `[${providerName}] Rate limit reached (${this.maxRequests} req/${this.windowMs}ms). Throttling for ${waitTime}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));

        // Recurse to ensure we're still within limits after waiting
        return this.throttle(providerName);
    }

    /**
     * Execute an operation with automatic rate limiting and retry on 429 errors
     * This method wraps the operation with rate limiting and retries internally
     * without raising rate limit errors to the caller
     * @param operation The async operation to execute
     * @param providerName Name of the provider for logging
     * @returns The result of the successful operation
     */
    async executeWithRetry<T>(
        operation: () => Promise<T>,
        providerName: string
    ): Promise<T> {
        // First, apply rate limiting throttle
        await this.throttle(providerName);

        // Then execute with automatic retry on rate limit errors
        return this.retryManager.executeWithRetry(
            operation,
            (error) => RetryManager.isRateLimitError(error),
            providerName
        );
    }
}
