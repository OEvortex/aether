/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Checks if a directory is within a git repository
 * @param directory The directory to check
 * @returns true if the directory is in a git repository, false otherwise
 */
export declare function isGitRepository(directory: string): boolean;
/**
 * Finds the root directory of a git repository
 * @param directory Starting directory to search from
 * @returns The git repository root path, or null if not in a git repository
 */
export declare function findGitRoot(directory: string): string | null;
/**
 * Gets the current git branch, if in a git repository.
 */
export declare const getGitBranch: (cwd: string) => string | undefined;
/**
 * Gets the git repository full name (owner/repo), if in a git repository.
 * Tries to get the name from the remote URL first, then falls back to the directory name.
 */
export declare const getGitRepoName: (cwd: string) => string | undefined;
