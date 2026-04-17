/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Base implementation for web search providers.
 * Provides common functionality for error handling.
 */
export class BaseWebSearchProvider {
    /**
     * Execute a web search with error handling.
     * @param query The search query
     * @param signal Abort signal for cancellation
     * @returns Promise resolving to search results
     */
    async search(query, signal) {
        if (!this.isAvailable()) {
            throw new Error(`[${this.name}] Provider is not available. Please check your configuration.`);
        }
        try {
            return await this.performSearch(query, signal);
        }
        catch (error) {
            if (error instanceof Error &&
                error.message.startsWith(`[${this.name}]`)) {
                throw error;
            }
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`[${this.name}] Search failed: ${message}`);
        }
    }
}
//# sourceMappingURL=base-provider.js.map