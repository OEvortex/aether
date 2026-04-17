/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface RetryInfo {
    /** Formatted error message for display, produced by parseAndFormatApiError. */
    message?: string;
    /** Current retry attempt (1-based). */
    attempt: number;
    /** Max retries allowed. */
    maxRetries: number;
    /** Delay in milliseconds before the retry happens. */
    delayMs: number;
    /** When called, resolves the delay promise early so the retry happens immediately. */
    skipDelay: () => void;
}
/**
 * Detects rate-limit / throttling errors and returns retry info.
 *
 * @param error - The error to check.
 * @param extraCodes - Additional error codes to treat as rate-limit errors,
 *   merged with the built-in set at call time (not mutating the default set).
 */
export declare function isRateLimitError(error: unknown, extraCodes?: readonly number[]): boolean;
