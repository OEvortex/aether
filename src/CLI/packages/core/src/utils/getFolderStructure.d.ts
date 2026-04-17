/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { FileFilteringOptions } from '../config/constants.js';
import type { FileDiscoveryService } from '../services/fileDiscoveryService.js';
/** Options for customizing folder structure retrieval. */
interface FolderStructureOptions {
    /** Maximum number of files and folders combined to display. Defaults to 20. */
    maxItems?: number;
    /** Set of folder names to ignore completely. Case-sensitive. */
    ignoredFolders?: Set<string>;
    /** Optional regex to filter included files by name. */
    fileIncludePattern?: RegExp;
    /** For filtering files. */
    fileService?: FileDiscoveryService;
    /** File filtering ignore options. */
    fileFilteringOptions?: FileFilteringOptions;
}
/**
 * Generates a string representation of a directory's structure,
 * limiting the number of items displayed. Ignored folders are shown
 * followed by '...' instead of their contents.
 *
 * @param directory The absolute or relative path to the directory.
 * @param options Optional configuration settings.
 * @returns A promise resolving to the formatted folder structure string.
 */
export declare function getFolderStructure(directory: string, options?: FolderStructureOptions): Promise<string>;
export {};
