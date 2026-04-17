/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseWebSearchProvider } from '../base-provider.js';
import type { TavilyProviderConfig, WebSearchResult } from '../types.js';
/**
 * Web search provider using Tavily API.
 */
export declare class TavilyProvider extends BaseWebSearchProvider {
    private readonly config;
    readonly name = "Tavily";
    constructor(config: TavilyProviderConfig);
    isAvailable(): boolean;
    protected performSearch(query: string, signal: AbortSignal): Promise<WebSearchResult>;
}
