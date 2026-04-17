/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool } from './tools.js';
/**
 * Parameters for the WebFetch tool
 */
export interface WebFetchToolParams {
    /**
     * The URL to fetch content from
     */
    url: string;
    /**
     * The prompt to run on the fetched content
     */
    prompt: string;
}
/**
 * Implementation of the WebFetch tool logic
 */
export declare class WebFetchTool extends BaseDeclarativeTool<WebFetchToolParams, ToolResult> {
    private readonly config;
    static readonly Name: string;
    constructor(config: Config);
    protected validateToolParamValues(params: WebFetchToolParams): string | null;
    protected createInvocation(params: WebFetchToolParams): ToolInvocation<WebFetchToolParams, ToolResult>;
}
