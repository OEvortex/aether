/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { AuthType } from '../core/contentGenerator.js';
import { createDebugLogger } from './debugLogger.js';
import { getErrorStatus } from './errors.js';
import { isQwenQuotaExceededError } from './quotaErrorDetection.js';
const debugLogger = createDebugLogger('RETRY');
const DEFAULT_RETRY_OPTIONS = {
    maxAttempts: 7,
    initialDelayMs: 1500,
    maxDelayMs: 30000, // 30 seconds
    shouldRetryOnError: defaultShouldRetry
};
/**
 * Default predicate function to determine if a retry should be attempted.
 * Retries on 429 (Too Many Requests) and 5xx server errors.
 * @param error The error object.
 * @returns True if the error is a transient error, false otherwise.
 */
function defaultShouldRetry(error) {
    const status = getErrorStatus(error);
    return (status === 429 ||
        (status !== undefined && status >= 500 && status < 600));
}
/**
 * Delays execution for a specified number of milliseconds.
 * @param ms The number of milliseconds to delay.
 * @returns A promise that resolves after the delay.
 */
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Retries a function with exponential backoff and jitter.
 * @param fn The asynchronous function to retry.
 * @param options Optional retry configuration.
 * @returns A promise that resolves with the result of the function if successful.
 * @throws The last error encountered if all attempts fail.
 */
export async function retryWithBackoff(fn, options) {
    if (options?.maxAttempts !== undefined && options.maxAttempts <= 0) {
        throw new Error('maxAttempts must be a positive number.');
    }
    const cleanOptions = options
        ? Object.fromEntries(Object.entries(options).filter(([_, v]) => v != null))
        : {};
    const { maxAttempts, initialDelayMs, maxDelayMs, authType, shouldRetryOnError, shouldRetryOnContent } = {
        ...DEFAULT_RETRY_OPTIONS,
        ...cleanOptions
    };
    let attempt = 0;
    let currentDelay = initialDelayMs;
    while (attempt < maxAttempts) {
        attempt++;
        try {
            const result = await fn();
            if (shouldRetryOnContent?.(result)) {
                const jitter = currentDelay * 0.3 * (Math.random() * 2 - 1);
                const delayWithJitter = Math.max(0, currentDelay + jitter);
                await delay(delayWithJitter);
                currentDelay = Math.min(maxDelayMs, currentDelay * 2);
                continue;
            }
            return result;
        }
        catch (error) {
            const errorStatus = getErrorStatus(error);
            // Check for Aether OAuth quota exceeded error - throw immediately without retry
            if (authType === AuthType.AETHER_OAUTH &&
                isQwenQuotaExceededError(error)) {
                throw new Error(`Aether OAuth quota exceeded: Your free daily quota has been reached.\n\n` +
                    `To continue using Aether without waiting, upgrade to the Alibaba Cloud Coding Plan:\n` +
                    `  China:       https://help.aliyun.com/zh/model-studio/coding-plan\n` +
                    `  Global/Intl: https://www.alibabacloud.com/help/en/model-studio/coding-plan\n\n` +
                    `After subscribing, run /auth to configure your Coding Plan API key.`);
            }
            // Check if we've exhausted retries or shouldn't retry
            if (attempt >= maxAttempts || !shouldRetryOnError(error)) {
                throw error;
            }
            const retryAfterMs = errorStatus === 429 ? getRetryAfterDelayMs(error) : 0;
            if (retryAfterMs > 0) {
                // Respect Retry-After header if present and parsed
                debugLogger.warn(`Attempt ${attempt} failed with status ${errorStatus ?? 'unknown'}. Retrying after explicit delay of ${retryAfterMs}ms...`, error);
                await delay(retryAfterMs);
                // Reset currentDelay for next potential non-429 error, or if Retry-After is not present next time
                currentDelay = initialDelayMs;
            }
            else {
                // Fallback to exponential backoff with jitter
                logRetryAttempt(attempt, error, errorStatus);
                // Add jitter: +/- 30% of currentDelay
                const jitter = currentDelay * 0.3 * (Math.random() * 2 - 1);
                const delayWithJitter = Math.max(0, currentDelay + jitter);
                await delay(delayWithJitter);
                currentDelay = Math.min(maxDelayMs, currentDelay * 2);
            }
        }
    }
    // This line should theoretically be unreachable due to the throw in the catch block.
    // Added for type safety and to satisfy the compiler that a promise is always returned.
    throw new Error('Retry attempts exhausted');
}
/**
 * Extracts the Retry-After delay from an error object's headers.
 * @param error The error object.
 * @returns The delay in milliseconds, or 0 if not found or invalid.
 */
function getRetryAfterDelayMs(error) {
    if (typeof error === 'object' && error !== null) {
        // Check for error.response.headers (common in axios errors)
        if ('response' in error &&
            typeof error.response === 'object' &&
            error.response !== null) {
            const response = error
                .response;
            if ('headers' in response &&
                typeof response.headers === 'object' &&
                response.headers !== null) {
                const headers = response.headers;
                const retryAfterHeader = headers['retry-after'];
                if (typeof retryAfterHeader === 'string') {
                    const retryAfterSeconds = parseInt(retryAfterHeader, 10);
                    if (!Number.isNaN(retryAfterSeconds)) {
                        return retryAfterSeconds * 1000;
                    }
                    // It might be an HTTP date
                    const retryAfterDate = new Date(retryAfterHeader);
                    if (!Number.isNaN(retryAfterDate.getTime())) {
                        return Math.max(0, retryAfterDate.getTime() - Date.now());
                    }
                }
            }
        }
    }
    return 0;
}
/**
 * Logs a message for a retry attempt when using exponential backoff.
 * @param attempt The current attempt number.
 * @param error The error that caused the retry.
 * @param errorStatus The HTTP status code of the error, if available.
 */
function logRetryAttempt(attempt, error, errorStatus) {
    const message = errorStatus
        ? `Attempt ${attempt} failed with status ${errorStatus}. Retrying with backoff...`
        : `Attempt ${attempt} failed. Retrying with backoff...`;
    if (errorStatus === 429) {
        debugLogger.warn(message, error);
    }
    else if (errorStatus && errorStatus >= 500 && errorStatus < 600) {
        debugLogger.error(message, error);
    }
    else {
        debugLogger.warn(message, error);
    }
}
//# sourceMappingURL=retry.js.map