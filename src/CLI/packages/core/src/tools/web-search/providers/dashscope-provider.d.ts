/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseWebSearchProvider } from '../base-provider.js';
import type { DashScopeProviderConfig, WebSearchResult } from '../types.js';
/**
 * Web search provider using Alibaba Cloud DashScope API.
 */
export declare class DashScopeProvider extends BaseWebSearchProvider {
    private readonly config;
    readonly name = "DashScope";
    constructor(config: DashScopeProviderConfig);
    isAvailable(): boolean;
    /**
     * Get the access token and API endpoint for authentication and web search.
     * Tries OAuth credentials first, falls back to apiKey if OAuth is not available.
     * Returns both token and endpoint to avoid loading credentials multiple times.
     */
    private getAuthConfig;
    protected performSearch(query: string, signal: AbortSignal): Promise<WebSearchResult>;
}
