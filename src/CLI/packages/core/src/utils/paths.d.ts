/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
export declare const AETHER_DIR = ".aether";
export declare const GOOGLE_ACCOUNTS_FILENAME = "google_accounts.json";
/**
 * Special characters that need to be escaped in file paths for shell compatibility.
 * Includes: spaces, parentheses, brackets, braces, semicolons, ampersands, pipes,
 * asterisks, question marks, dollar signs, backticks, quotes, hash, and other shell metacharacters.
 */
export declare const SHELL_SPECIAL_CHARS: RegExp;
/**
 * Replaces the home directory with a tilde.
 * @param path - The path to tildeify.
 * @returns The tildeified path.
 */
export declare function tildeifyPath(path: string): string;
/**
 * Shortens a path string if it exceeds maxLen, prioritizing the start and end segments.
 * Shows root + first segment + "..." + end segments when middle segments are omitted.
 * Example: /path/to/a/very/long/file.txt -> /path/.../long/file.txt
 */
export declare function shortenPath(filePath: string, maxLen?: number): string;
/**
 * Calculates the relative path from a root directory to a target path.
 * Ensures both paths are resolved before calculating.
 * Returns '.' if the target path is the same as the root directory.
 *
 * @param targetPath The absolute or relative path to make relative.
 * @param rootDirectory The absolute path of the directory to make the target path relative to.
 * @returns The relative path from rootDirectory to targetPath.
 */
export declare function makeRelative(targetPath: string, rootDirectory: string): string;
/**
 * Escapes special characters in a file path like macOS terminal does.
 * Escapes: spaces, parentheses, brackets, braces, semicolons, ampersands, pipes,
 * asterisks, question marks, dollar signs, backticks, quotes, hash, and other shell metacharacters.
 */
export declare function escapePath(filePath: string): string;
/**
 * Unescapes special characters in a file path.
 * Removes backslash escaping from shell metacharacters.
 */
export declare function unescapePath(filePath: string): string;
/**
 * Generates a unique hash for a project based on its root path.
 * On Windows, paths are case-insensitive, so we normalize to lowercase
 * to ensure the same physical path always produces the same hash.
 * @param projectRoot The absolute path to the project's root directory.
 * @returns A SHA256 hash of the project root path.
 */
export declare function getProjectHash(projectRoot: string): string;
/**
 * Sanitizes a directory path to create a safe project ID.
 *
 * - On Windows: normalizes to lowercase for case-insensitive matching
 * - Replaces all non-alphanumeric characters with hyphens
 *
 * This is used for:
 * - Creating project-specific directories
 * - Generating session IDs for debug logging during startup
 *
 * @param cwd - The directory path to sanitize
 * @returns A sanitized string safe for use as a project identifier
 */
export declare function sanitizeCwd(cwd: string): string;
/**
 * Checks if a path is a subpath of another path.
 * @param parentPath The parent path.
 * @param childPath The child path.
 * @returns True if childPath is a subpath of parentPath, false otherwise.
 */
export declare function isSubpath(parentPath: string, childPath: string): boolean;
export declare function isSubpaths(parentPath: string[], childPath: string): boolean;
/**
 * Resolves a path with tilde (~) expansion and relative path resolution.
 * Handles tilde expansion for home directory and resolves relative paths
 * against the provided base directory or current working directory.
 *
 * @param baseDir The base directory to resolve relative paths against (defaults to current working directory)
 * @param relativePath The path to resolve (can be relative, absolute, or tilde-prefixed)
 * @returns The resolved absolute path
 */
export declare function resolvePath(baseDir: string | undefined, relativePath: string): string;
export interface PathValidationOptions {
    /**
     * If true, allows both files and directories. If false (default), only allows directories.
     */
    allowFiles?: boolean;
    /**
     * If true, allows paths outside the workspace boundaries.
     * The caller is responsible for adjusting permissions (e.g. 'ask') for
     * external paths.
     */
    allowExternalPaths?: boolean;
}
/**
 * Validates that a resolved path exists within the workspace boundaries.
 *
 * @param config The configuration object containing workspace context
 * @param resolvedPath The absolute path to validate
 * @param options Validation options
 * @throws Error if the path is outside workspace boundaries, doesn't exist, or is not a directory (when allowFiles is false)
 */
export declare function validatePath(config: Config, resolvedPath: string, options?: PathValidationOptions): void;
/**
 * Resolves a path relative to the workspace root and verifies that it exists
 * within the workspace boundaries defined in the config.
 *
 * @param config The configuration object
 * @param relativePath The relative path to resolve (optional, defaults to target directory)
 * @param options Validation options (e.g., allowFiles to permit file paths)
 */
export declare function resolveAndValidatePath(config: Config, relativePath?: string, options?: PathValidationOptions): string;
