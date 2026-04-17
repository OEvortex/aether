/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Generates a unique cache key based on the project directory and the content
 * of ignore files. This ensures that the cache is invalidated if the project
 * or ignore rules change.
 */
export declare const getCacheKey: (directory: string, ignoreContent: string, maxDepth?: number) => string;
/**
 * Reads cached data from the in-memory cache.
 * Returns undefined if the key is not found.
 */
export declare const read: (key: string) => string[] | undefined;
/**
 * Writes data to the in-memory cache and sets a timer to evict it after the TTL.
 */
export declare const write: (key: string, results: string[], ttlMs: number) => void;
/**
 * Clears the entire cache and all active timers.
 * Primarily used for testing.
 */
export declare const clear: () => void;
