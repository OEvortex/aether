/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import type { WebSearchProvider, WebSearchResult } from './types.js';
/**
 * Base implementation for web search providers.
 * Provides common functionality for error handling.
 */
export declare abstract class BaseWebSearchProvider implements WebSearchProvider {
    abstract readonly name: string;
    /**
     * Check if the provider is available (has required configuration).
     */
    abstract isAvailable(): boolean;
    /**
     * Perform the actual search implementation.
     * @param query The search query
     * @param signal Abort signal for cancellation
     * @returns Promise resolving to search results
     */
    protected abstract performSearch(query: string, signal: AbortSignal): Promise<WebSearchResult>;
    /**
     * Execute a web search with error handling.
     * @param query The search query
     * @param signal Abort signal for cancellation
     * @returns Promise resolving to search results
     */
    search(query: string, signal: AbortSignal): Promise<WebSearchResult>;
}
