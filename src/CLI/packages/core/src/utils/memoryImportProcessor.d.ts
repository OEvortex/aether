/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Interface for tracking import processing state to prevent circular imports
 */
interface ImportState {
    processedFiles: Set<string>;
    maxDepth: number;
    currentDepth: number;
    currentFile?: string;
}
/**
 * Interface representing a file in the import tree
 */
export interface MemoryFile {
    path: string;
    imports?: MemoryFile[];
}
/**
 * Result of processing imports
 */
export interface ProcessImportsResult {
    content: string;
    importTree: MemoryFile;
}
/**
 * Processes import statements in AGENTS.md content
 * Supports @path/to/file syntax for importing content from other files
 * @param content - The content to process for imports
 * @param basePath - The directory path where the current file is located
 * @param importState - State tracking for circular import prevention
 * @param projectRoot - The project root directory for allowed directories
 * @param importFormat - The format of the import tree
 * @returns Processed content with imports resolved and import tree
 */
export declare function processImports(content: string, basePath: string, importState?: ImportState, projectRoot?: string, importFormat?: 'flat' | 'tree'): Promise<ProcessImportsResult>;
export declare function validateImportPath(importPath: string, basePath: string, allowedDirectories: string[]): boolean;
export {};
