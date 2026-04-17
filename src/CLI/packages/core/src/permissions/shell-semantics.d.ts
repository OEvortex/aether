/**
 * @license
 * Copyright 2025 Qwen team
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * A virtual file or network operation extracted from a shell command.
 * Used to match Read / Edit / Write / WebFetch / ListFiles permission rules
 * against shell commands that perform equivalent operations.
 */
export interface ShellOperation {
    /**
     * The virtual tool this operation maps to.
     * Matches the canonical tool names used in the permission system.
     */
    virtualTool: 'read_file' | 'list_directory' | 'edit' | 'write_file' | 'web_fetch' | 'grep_search';
    /** Absolute file or directory path (for file operations). */
    filePath?: string;
    /** Domain name without port (for web_fetch operations). */
    domain?: string;
}
/**
 * Extract virtual file/network operations from a single simple shell command.
 *
 * This function expects a **single simple command** (no `&&`, `||`, `;`, `|`
 * operators).  Use `splitCompoundCommand()` before calling this for compound
 * commands.
 *
 * Returns an empty array for:
 *   - Commands not in the known command table (safe default)
 *   - Empty or whitespace-only input
 *   - Pure environment variable assignments (`FOO=bar`)
 *
 * @param simpleCommand - A single shell command without compound operators.
 * @param cwd           - Working directory for resolving relative paths.
 */
export declare function extractShellOperations(simpleCommand: string, cwd: string): ShellOperation[];
