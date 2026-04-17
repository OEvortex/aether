/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface FileSearchOptions {
    projectRoot: string;
    ignoreDirs: string[];
    useGitignore: boolean;
    useAetherignore: boolean;
    cache: boolean;
    cacheTtl: number;
    enableRecursiveFileSearch: boolean;
    enableFuzzySearch: boolean;
    maxDepth?: number;
}
export declare class AbortError extends Error {
    constructor(message?: string);
}
/**
 * Filters a list of paths based on a given pattern.
 * @param allPaths The list of all paths to filter.
 * @param pattern The picomatch pattern to filter by.
 * @param signal An AbortSignal to cancel the operation.
 * @returns A promise that resolves to the filtered and sorted list of paths.
 */
export declare function filter(allPaths: string[], pattern: string, signal: AbortSignal | undefined): Promise<string[]>;
export interface SearchOptions {
    signal?: AbortSignal;
    maxResults?: number;
}
export interface FileSearch {
    initialize(): Promise<void>;
    search(pattern: string, options?: SearchOptions): Promise<string[]>;
}
export declare class FileSearchFactory {
    static create(options: FileSearchOptions): FileSearch;
}
