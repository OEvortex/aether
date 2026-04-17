/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseWebSearchProvider } from '../base-provider.js';
import type { GoogleProviderConfig, WebSearchResult } from '../types.js';
/**
 * Web search provider using Google Custom Search API.
 */
export declare class GoogleProvider extends BaseWebSearchProvider {
    private readonly config;
    readonly name = "Google";
    constructor(config: GoogleProviderConfig);
    isAvailable(): boolean;
    protected performSearch(query: string, signal: AbortSignal): Promise<WebSearchResult>;
}
