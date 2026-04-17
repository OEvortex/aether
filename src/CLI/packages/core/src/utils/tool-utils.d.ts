/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { AnyDeclarativeTool, AnyToolInvocation } from '../index.js';
import { ToolNames } from '../tools/tool-names.js';
export type ToolName = (typeof ToolNames)[keyof typeof ToolNames];
export declare function isToolEnabled(toolName: ToolName, coreTools?: string[], excludeTools?: string[]): boolean;
/**
 * Checks if a tool invocation matches any of a list of patterns.
 *
 * @param toolOrToolName The tool object or the name of the tool being invoked.
 * @param invocation The invocation object for the tool.
 * @param patterns A list of patterns to match against.
 *   Patterns can be:
 *   - A tool name (e.g., "ReadFileTool") to match any invocation of that tool.
 *   - A tool name with a prefix (e.g., "ShellTool(git status)") to match
 *     invocations where the arguments start with that prefix.
 * @returns True if the invocation matches any pattern, false otherwise.
 */
export declare function doesToolInvocationMatch(toolOrToolName: AnyDeclarativeTool | string, invocation: AnyToolInvocation, patterns: string[]): boolean;
