/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import crypto from 'node:crypto';
const crawlCache = new Map();
const cacheTimers = new Map();
/**
 * Generates a unique cache key based on the project directory and the content
 * of ignore files. This ensures that the cache is invalidated if the project
 * or ignore rules change.
 */
export const getCacheKey = (directory, ignoreContent, maxDepth) => {
    const hash = crypto.createHash('sha256');
    hash.update(directory);
    hash.update(ignoreContent);
    if (maxDepth !== undefined) {
        hash.update(String(maxDepth));
    }
    return hash.digest('hex');
};
/**
 * Reads cached data from the in-memory cache.
 * Returns undefined if the key is not found.
 */
export const read = (key) => crawlCache.get(key);
/**
 * Writes data to the in-memory cache and sets a timer to evict it after the TTL.
 */
export const write = (key, results, ttlMs) => {
    // Clear any existing timer for this key to prevent premature deletion
    if (cacheTimers.has(key)) {
        clearTimeout(cacheTimers.get(key));
    }
    // Store the new data
    crawlCache.set(key, results);
    // Set a timer to automatically delete the cache entry after the TTL
    const timerId = setTimeout(() => {
        crawlCache.delete(key);
        cacheTimers.delete(key);
    }, ttlMs);
    // Store the timer handle so we can clear it if the entry is updated
    cacheTimers.set(key, timerId);
};
/**
 * Clears the entire cache and all active timers.
 * Primarily used for testing.
 */
export const clear = () => {
    for (const timerId of cacheTimers.values()) {
        clearTimeout(timerId);
    }
    crawlCache.clear();
    cacheTimers.clear();
};
//# sourceMappingURL=crawlCache.js.map