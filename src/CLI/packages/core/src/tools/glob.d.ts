/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool } from './tools.js';
export interface GlobPath {
    fullpath(): string;
    mtimeMs?: number;
}
/**
 * Sorts file entries based on recency and then alphabetically.
 * Recent files (modified within recencyThresholdMs) are listed first, newest to oldest.
 * Older files are listed after recent ones, sorted alphabetically by path.
 */
export declare function sortFileEntries(entries: GlobPath[], nowTimestamp: number, recencyThresholdMs: number): GlobPath[];
/**
 * Parameters for the GlobTool
 */
export interface GlobToolParams {
    /**
     * The glob pattern to match files against
     */
    pattern: string;
    /**
     * The directory to search in (optional, defaults to current directory)
     */
    path?: string;
}
/**
 * Implementation of the Glob tool logic
 */
export declare class GlobTool extends BaseDeclarativeTool<GlobToolParams, ToolResult> {
    private config;
    static readonly Name: "glob";
    constructor(config: Config);
    /**
     * Validates the parameters for the tool.
     */
    protected validateToolParamValues(params: GlobToolParams): string | null;
    protected createInvocation(params: GlobToolParams): ToolInvocation<GlobToolParams, ToolResult>;
}
