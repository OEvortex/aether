/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export class LruCache {
    cache;
    maxSize;
    constructor(maxSize) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }
    get(key) {
        const value = this.cache.get(key);
        if (value) {
            // Move to end to mark as recently used
            this.cache.delete(key);
            this.cache.set(key, value);
        }
        return value;
    }
    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
        else if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(key, value);
    }
    clear() {
        this.cache.clear();
    }
}
//# sourceMappingURL=LruCache.js.map