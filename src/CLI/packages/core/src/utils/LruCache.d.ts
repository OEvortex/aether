/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export declare class LruCache<K, V> {
    private cache;
    private maxSize;
    constructor(maxSize: number);
    get(key: K): V | undefined;
    set(key: K, value: V): void;
    clear(): void;
}
