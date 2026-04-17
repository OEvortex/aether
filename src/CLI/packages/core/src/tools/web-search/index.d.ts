/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../../config/config.js';
import { BaseDeclarativeTool, type ToolInvocation } from '../tools.js';
import type { WebSearchToolParams, WebSearchToolResult } from './types.js';
/**
 * A tool to perform web searches using configurable providers.
 */
export declare class WebSearchTool extends BaseDeclarativeTool<WebSearchToolParams, WebSearchToolResult> {
    private readonly config;
    static readonly Name: string;
    constructor(config: Config);
    /**
     * Validates the parameters for the WebSearchTool.
     * @param params The parameters to validate
     * @returns An error message string if validation fails, null if valid
     */
    protected validateToolParamValues(params: WebSearchToolParams): string | null;
    protected createInvocation(params: WebSearchToolParams): ToolInvocation<WebSearchToolParams, WebSearchToolResult>;
}
export type { WebSearchConfig, WebSearchProviderConfig, WebSearchToolParams, WebSearchToolResult } from './types.js';
