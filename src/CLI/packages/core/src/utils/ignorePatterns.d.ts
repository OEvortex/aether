/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
/**
 * Common ignore patterns used across multiple tools for basic exclusions.
 * These are the most commonly ignored directories in development projects.
 */
export declare const COMMON_IGNORE_PATTERNS: string[];
/**
 * Binary file extension patterns that are typically excluded from text processing.
 */
export declare const BINARY_FILE_PATTERNS: string[];
/**
 * Media file patterns that require special handling in tools like read-many-files.
 * These files can be processed as inlineData when explicitly requested.
 */
export declare const MEDIA_FILE_PATTERNS: string[];
/**
 * Common directory patterns that are typically ignored in development projects.
 */
export declare const COMMON_DIRECTORY_EXCLUDES: string[];
/**
 * Python-specific patterns.
 */
export declare const PYTHON_EXCLUDES: string[];
/**
 * System and environment file patterns.
 */
export declare const SYSTEM_FILE_EXCLUDES: string[];
/**
 * Comprehensive file exclusion patterns combining all common ignore patterns.
 * These patterns are compatible with glob ignore patterns.
 * Note: Media files (PDF, images) are not excluded here as they need special handling in read-many-files.
 */
export declare const DEFAULT_FILE_EXCLUDES: string[];
/**
 * Options for configuring file exclusion patterns.
 */
export interface ExcludeOptions {
    /**
     * Whether to include default exclusion patterns. Defaults to true.
     */
    includeDefaults?: boolean;
    /**
     * Additional custom patterns from configuration.
     */
    customPatterns?: string[];
    /**
     * Additional patterns provided at runtime (e.g., from CLI arguments).
     */
    runtimePatterns?: string[];
    /**
     * Whether to include dynamic patterns like configured context filenames. Defaults to true.
     */
    includeDynamicPatterns?: boolean;
}
/**
 * Centralized file exclusion utility that provides configurable and extensible
 * file exclusion patterns for different tools and use cases.
 */
export declare class FileExclusions {
    private config?;
    constructor(config?: Config | undefined);
    /**
     * Gets core ignore patterns for basic file operations like glob.
     * These are the minimal essential patterns that should almost always be excluded.
     */
    getCoreIgnorePatterns(): string[];
    /**
     * Gets comprehensive default exclusion patterns for operations like read-many-files.
     * Includes all standard exclusions: directories, binary files, system files, etc.
     */
    getDefaultExcludePatterns(options?: ExcludeOptions): string[];
    /**
     * Gets exclude patterns for read-many-files tool with legacy compatibility.
     * This maintains the same behavior as the previous getDefaultExcludes() function.
     */
    getReadManyFilesExcludes(additionalExcludes?: string[]): string[];
    /**
     * Gets exclude patterns for glob tool operations.
     * Uses core patterns by default but can be extended with additional patterns.
     */
    getGlobExcludes(additionalExcludes?: string[]): string[];
    /**
     * Builds exclude patterns with full customization options.
     * This is the most flexible method for advanced use cases.
     */
    buildExcludePatterns(options: ExcludeOptions): string[];
}
/**
 * Extracts file extensions from glob patterns.
 * Converts patterns like glob/*.exe to .exe
 * Handles brace expansion like glob/*.{js,ts} to .js and .ts
 */
export declare function extractExtensionsFromPatterns(patterns: string[]): string[];
/**
 * Binary file extensions extracted from BINARY_FILE_PATTERNS for quick lookup.
 * Additional extensions not covered by the patterns are included for completeness.
 */
export declare const BINARY_EXTENSIONS: string[];
