/**
 * @license
 * Copyright 2026 OEvortex
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @deprecated Use `isShellCommandReadOnlyAST` from `./shellAstParser.js` instead.
 * This function uses regex + shell-quote for command parsing with known edge-case
 * limitations. The AST-based replacement provides accurate parsing via tree-sitter-bash.
 */
export declare function isShellCommandReadOnly(command: string): boolean;
