/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Implements an in-memory cache for file search results.
 * This cache optimizes subsequent searches by leveraging previously computed results.
 */
export declare class ResultCache {
    private readonly allFiles;
    private readonly cache;
    hits: number;
    misses: number;
    constructor(allFiles: string[]);
    /**
     * Retrieves cached search results for a given query, or provides a base set
     * of files to search from.
     * @param query The search query pattern.
     * @returns An object containing the files to search and a boolean indicating
     *          if the result is an exact cache hit.
     */
    get(query: string): Promise<{
        files: string[];
        isExactMatch: boolean;
    }>;
    /**
     * Stores search results in the cache.
     * @param query The search query pattern.
     * @param results The matching file paths to cache.
     */
    set(query: string, results: string[]): void;
}
