/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool } from './tools.js';
import type { Config } from '../config/config.js';
/**
 * Parameters for the GrepTool
 */
export interface GrepToolParams {
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
 * Implementation of the Grep tool logic (moved from CLI)
 */
export declare class GrepTool extends BaseDeclarativeTool<GrepToolParams, ToolResult> {
    private readonly config;
    static readonly Name: "grep_search";
    constructor(config: Config);
    /**
     * Validates the parameters for the tool
     * @param params Parameters to validate
     * @returns An error message string if invalid, null otherwise
     */
    protected validateToolParamValues(params: GrepToolParams): string | null;
    protected createInvocation(params: GrepToolParams): ToolInvocation<GrepToolParams, ToolResult>;
}
