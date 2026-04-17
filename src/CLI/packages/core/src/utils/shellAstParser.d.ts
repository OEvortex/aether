/**
 * @license
 * Copyright 2026 OEvortex
 * SPDX-License-Identifier: Apache-2.0
 */
import Parser from 'web-tree-sitter';
/**
 * Initialise the tree-sitter Parser singleton.
 * Safe to call multiple times – only the first call does real work.
 */
export declare function initParser(): Promise<void>;
/**
 * Parse a shell command string into a tree-sitter Tree.
 * Initialises the parser lazily if needed.
 */
export declare function parseShellCommand(command: string): Promise<Parser.Tree>;
/**
 * AST-based check whether a shell command is read-only.
 *
 * Replaces the regex-based `isShellCommandReadOnly()` from shellReadOnlyChecker.ts.
 * This version uses tree-sitter-bash for accurate parsing of:
 *   - Compound commands (&&, ||, ;, |)
 *   - Redirections (>, >>)
 *   - Command substitution ($(), ``)
 *   - Sub-shells, heredocs, etc.
 *
 * @param command - The shell command string to evaluate.
 * @returns `true` if the command only performs read-only operations.
 */
export declare function isShellCommandReadOnlyAST(command: string): Promise<boolean>;
/**
 * Extract minimum-scope wildcard permission rules from a shell command.
 *
 * Rules follow the minimum-scope principle:
 *   - Preserve root command + sub-command, replace arguments with `*`
 *   - Compound commands are split → separate rules for each part
 *   - No arguments → no wildcard suffix
 *
 * @param command - The full shell command string.
 * @returns Deduplicated list of permission rule strings.
 *
 * @example
 * extractCommandRules('git clone https://github.com/foo/bar.git')
 * // → ['git clone *']
 *
 * extractCommandRules('npm install express')
 * // → ['npm install *']
 *
 * extractCommandRules('npm outdated')
 * // → ['npm outdated']
 *
 * extractCommandRules('cat /etc/passwd')
 * // → ['cat *']
 *
 * extractCommandRules('git clone foo && npm install')
 * // → ['git clone *', 'npm install']
 *
 * extractCommandRules('ls -la /tmp')
 * // → ['ls *']
 *
 * extractCommandRules('docker compose up -d')
 * // → ['docker compose up *']
 */
export declare function extractCommandRules(command: string): Promise<string[]>;
/**
 * Reset the parser singleton. Only intended for testing.
 * @internal
 */
export declare function _resetParser(): void;
/**
 * Force the parser into the "init failed" state. Only intended for testing
 * fallback behaviour without actually breaking WASM loading.
 * @internal
 */
export declare function _setParserFailedForTesting(): void;
/**
 * Internal helper exposed for tests.
 * @internal
 */
export declare function _resolveWasmPathForTesting(filename: string, moduleFilePath: string, resolvePath?: (moduleFilePath: string) => string): string;
