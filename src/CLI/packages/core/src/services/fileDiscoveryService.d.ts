/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface FilterFilesOptions {
    respectGitIgnore?: boolean;
    respectAetherIgnore?: boolean;
    respectQwenIgnore?: boolean;
}
export interface FilterReport {
    filteredPaths: string[];
    gitIgnoredCount: number;
    aetherIgnoredCount: number;
}
export declare class FileDiscoveryService {
    private gitIgnoreFilter;
    private aetherIgnoreFilter;
    private projectRoot;
    constructor(projectRoot: string);
    /**
     * Filters a list of file paths based on git ignore rules
     */
    filterFiles(filePaths: string[], options?: FilterFilesOptions): string[];
    /**
     * Filters a list of file paths based on git ignore rules and returns a report
     * with counts of ignored files.
     */
    filterFilesWithReport(filePaths: string[], opts?: FilterFilesOptions): FilterReport;
    /**
     * Checks if a single file should be git-ignored
     */
    shouldGitIgnoreFile(filePath: string): boolean;
    /**
     * Checks if a single file should be aether-ignored
     */
    shouldAetherIgnoreFile(filePath: string): boolean;
    /**
     * Unified method to check if a file should be ignored based on filtering options
     */
    shouldIgnoreFile(filePath: string, options?: FilterFilesOptions): boolean;
    /**
     * Returns loaded patterns from .aetherignore
     */
    getAetherIgnorePatterns(): string[];
}
