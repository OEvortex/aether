/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import path from 'node:path';
import { getAllGeminiMdFilenames } from '../tools/memoryTool.js';
/**
 * Common ignore patterns used across multiple tools for basic exclusions.
 * These are the most commonly ignored directories in development projects.
 */
export const COMMON_IGNORE_PATTERNS = [
    '**/node_modules/**',
    '**/.git/**',
    '**/bower_components/**',
    '**/.svn/**',
    '**/.hg/**'
];
/**
 * Binary file extension patterns that are typically excluded from text processing.
 */
export const BINARY_FILE_PATTERNS = [
    '**/*.bin',
    '**/*.exe',
    '**/*.dll',
    '**/*.so',
    '**/*.dylib',
    '**/*.class',
    '**/*.jar',
    '**/*.war',
    '**/*.zip',
    '**/*.tar',
    '**/*.gz',
    '**/*.bz2',
    '**/*.rar',
    '**/*.7z',
    '**/*.doc',
    '**/*.docx',
    '**/*.xls',
    '**/*.xlsx',
    '**/*.ppt',
    '**/*.pptx',
    '**/*.odt',
    '**/*.ods',
    '**/*.odp'
];
/**
 * Media file patterns that require special handling in tools like read-many-files.
 * These files can be processed as inlineData when explicitly requested.
 */
export const MEDIA_FILE_PATTERNS = [
    '**/*.pdf',
    '**/*.png',
    '**/*.jpg',
    '**/*.jpeg',
    '**/*.gif',
    '**/*.webp',
    '**/*.bmp',
    '**/*.svg'
];
/**
 * Common directory patterns that are typically ignored in development projects.
 */
export const COMMON_DIRECTORY_EXCLUDES = [
    '**/.vscode/**',
    '**/.idea/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/__pycache__/**'
];
/**
 * Python-specific patterns.
 */
export const PYTHON_EXCLUDES = ['**/*.pyc', '**/*.pyo'];
/**
 * System and environment file patterns.
 */
export const SYSTEM_FILE_EXCLUDES = ['**/.DS_Store', '**/.env'];
/**
 * Comprehensive file exclusion patterns combining all common ignore patterns.
 * These patterns are compatible with glob ignore patterns.
 * Note: Media files (PDF, images) are not excluded here as they need special handling in read-many-files.
 */
export const DEFAULT_FILE_EXCLUDES = [
    ...COMMON_IGNORE_PATTERNS,
    ...COMMON_DIRECTORY_EXCLUDES,
    ...BINARY_FILE_PATTERNS,
    ...PYTHON_EXCLUDES,
    ...SYSTEM_FILE_EXCLUDES
];
/**
 * Centralized file exclusion utility that provides configurable and extensible
 * file exclusion patterns for different tools and use cases.
 */
export class FileExclusions {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Gets core ignore patterns for basic file operations like glob.
     * These are the minimal essential patterns that should almost always be excluded.
     */
    getCoreIgnorePatterns() {
        return [...COMMON_IGNORE_PATTERNS];
    }
    /**
     * Gets comprehensive default exclusion patterns for operations like read-many-files.
     * Includes all standard exclusions: directories, binary files, system files, etc.
     */
    getDefaultExcludePatterns(options = {}) {
        const { includeDefaults = true, customPatterns = [], runtimePatterns = [], includeDynamicPatterns = true } = options;
        const patterns = [];
        // Add base defaults if requested
        if (includeDefaults) {
            patterns.push(...DEFAULT_FILE_EXCLUDES);
        }
        // Add dynamic patterns (like context filenames)
        if (includeDynamicPatterns) {
            for (const filename of getAllGeminiMdFilenames()) {
                patterns.push(`**/${filename}`);
            }
        }
        // Add custom patterns from configuration
        // TODO: getCustomExcludes method needs to be implemented in Config interface
        if (this.config) {
            const configCustomExcludes = this.config.getCustomExcludes?.() ?? [];
            patterns.push(...configCustomExcludes);
        }
        // Add user-provided custom patterns
        patterns.push(...customPatterns);
        // Add runtime patterns (e.g., from CLI)
        patterns.push(...runtimePatterns);
        return patterns;
    }
    /**
     * Gets exclude patterns for read-many-files tool with legacy compatibility.
     * This maintains the same behavior as the previous getDefaultExcludes() function.
     */
    getReadManyFilesExcludes(additionalExcludes = []) {
        return this.getDefaultExcludePatterns({
            includeDefaults: true,
            runtimePatterns: additionalExcludes,
            includeDynamicPatterns: true
        });
    }
    /**
     * Gets exclude patterns for glob tool operations.
     * Uses core patterns by default but can be extended with additional patterns.
     */
    getGlobExcludes(additionalExcludes = []) {
        const corePatterns = this.getCoreIgnorePatterns();
        // Add any custom patterns from config if available
        // TODO: getCustomExcludes method needs to be implemented in Config interface
        const configPatterns = this.config?.getCustomExcludes?.() ?? [];
        return [...corePatterns, ...configPatterns, ...additionalExcludes];
    }
    /**
     * Builds exclude patterns with full customization options.
     * This is the most flexible method for advanced use cases.
     */
    buildExcludePatterns(options) {
        return this.getDefaultExcludePatterns(options);
    }
}
/**
 * Extracts file extensions from glob patterns.
 * Converts patterns like glob/*.exe to .exe
 * Handles brace expansion like glob/*.{js,ts} to .js and .ts
 */
export function extractExtensionsFromPatterns(patterns) {
    const extensions = new Set(patterns
        .filter((pattern) => pattern.includes('*.'))
        .flatMap((pattern) => {
        const extPart = pattern.substring(pattern.lastIndexOf('*.') + 1);
        // Handle brace expansion e.g. `**/*.{jpg,png}`
        if (extPart.startsWith('.{') && extPart.endsWith('}')) {
            const inner = extPart.slice(2, -1); // get 'jpg,png'
            return inner
                .split(',')
                .map((ext) => `.${ext.trim()}`)
                .filter((ext) => ext !== '.');
        }
        // Handle simple/compound/dotfile extensions
        if (extPart.startsWith('.') &&
            !extPart.includes('/') &&
            !extPart.includes('{') &&
            !extPart.includes('}')) {
            // Using path.extname on a dummy file handles various cases like
            // '.tar.gz' -> '.gz' and '.profile' -> '.profile' correctly.
            const extracted = path.extname(`dummy${extPart}`);
            // If extname returns empty (e.g. for '.'), use the original part.
            // Then filter out empty or '.' results and invalid double dot patterns.
            const result = extracted || extPart;
            return result &&
                result !== '.' &&
                !result.substring(1).includes('.')
                ? [result]
                : [];
        }
        return [];
    }));
    return Array.from(extensions).sort();
}
/**
 * Binary file extensions extracted from BINARY_FILE_PATTERNS for quick lookup.
 * Additional extensions not covered by the patterns are included for completeness.
 */
export const BINARY_EXTENSIONS = [
    ...extractExtensionsFromPatterns([
        ...BINARY_FILE_PATTERNS,
        ...MEDIA_FILE_PATTERNS,
        ...PYTHON_EXCLUDES
    ]),
    // Additional binary extensions not in the main patterns
    '.dat',
    '.obj',
    '.o',
    '.a',
    '.lib',
    '.wasm'
].sort();
//# sourceMappingURL=ignorePatterns.js.map