/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool } from './tools.js';
/**
 * Parameters for the LS tool
 */
export interface LSToolParams {
    /**
     * The absolute path to the directory to list
     */
    path: string;
    /**
     * Array of glob patterns to ignore (optional)
     */
    ignore?: string[];
    /**
     * Whether to respect .gitignore and .aetherignore patterns (optional, defaults to true)
     */
    file_filtering_options?: {
        respect_git_ignore?: boolean;
        respect_aether_ignore?: boolean;
    };
}
/**
 * File entry returned by LS tool
 */
export interface FileEntry {
    /**
     * Name of the file or directory
     */
    name: string;
    /**
     * Absolute path to the file or directory
     */
    path: string;
    /**
     * Whether this entry is a directory
     */
    isDirectory: boolean;
    /**
     * Size of the file in bytes (0 for directories)
     */
    size: number;
    /**
     * Last modified timestamp
     */
    modifiedTime: Date;
}
/**
 * Implementation of the LS tool logic
 */
export declare class LSTool extends BaseDeclarativeTool<LSToolParams, ToolResult> {
    private config;
    static readonly Name: "list_directory";
    constructor(config: Config);
    /**
     * Validates the parameters for the tool
     * @param params Parameters to validate
     * @returns An error message string if invalid, null otherwise
     */
    protected validateToolParamValues(params: LSToolParams): string | null;
    protected createInvocation(params: LSToolParams): ToolInvocation<LSToolParams, ToolResult>;
}
