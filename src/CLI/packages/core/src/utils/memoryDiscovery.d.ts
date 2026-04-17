/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { FileDiscoveryService } from '../services/fileDiscoveryService.js';
export interface LoadServerHierarchicalMemoryResponse {
    memoryContent: string;
    fileCount: number;
}
/**
 * Loads hierarchical AGENTS.md files and concatenates their content.
 * This function is intended for use by the server.
 */
export declare function loadServerHierarchicalMemory(currentWorkingDirectory: string, includeDirectoriesToReadGemini: readonly string[], fileService: FileDiscoveryService, extensionContextFilePaths: string[] | undefined, folderTrust: boolean, importFormat?: 'flat' | 'tree'): Promise<LoadServerHierarchicalMemoryResponse>;
