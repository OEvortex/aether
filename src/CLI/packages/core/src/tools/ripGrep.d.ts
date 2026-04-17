/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool } from './tools.js';
/**
 * Parameters for the GrepTool (Simplified)
 */
export interface RipGrepToolParams {
    /**
     * The regular expression pattern to search for in file contents
     */
    pattern: string;
    /**
     * The directory to search in (optional, defaults to current directory relative to root)
     */
    path?: string;
    /**
     * Glob pattern to filter files (e.g. "*.js", "*.{ts,tsx}")
     */
    glob?: string;
    /**
     * Maximum number of matching lines to return (optional, shows all if not specified)
     */
    limit?: number;
}
/**
 * Implementation of the Grep tool logic
 */
export declare class RipGrepTool extends BaseDeclarativeTool<RipGrepToolParams, ToolResult> {
    private readonly config;
    static readonly Name: "grep_search";
    constructor(config: Config);
    /**
     * Validates the parameters for the tool
     * @param params Parameters to validate
     * @returns An error message string if invalid, null otherwise
     */
    protected validateToolParamValues(params: RipGrepToolParams): string | null;
    protected createInvocation(params: RipGrepToolParams): ToolInvocation<RipGrepToolParams, ToolResult>;
}
