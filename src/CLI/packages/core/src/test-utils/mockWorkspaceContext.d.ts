/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { WorkspaceContext } from '../utils/workspaceContext.js';
/**
 * Creates a mock WorkspaceContext for testing
 * @param rootDir The root directory to use for the mock
 * @param additionalDirs Optional additional directories to include in the workspace
 * @returns A mock WorkspaceContext instance
 */
export declare function createMockWorkspaceContext(rootDir: string, additionalDirs?: string[]): WorkspaceContext;
