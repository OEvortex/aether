/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseWebSearchProvider } from '../base-provider.js';
/**
 * Web search provider using Google Custom Search API.
 */
export class GoogleProvider extends BaseWebSearchProvider {
    config;
    name = 'Google';
    constructor(config) {
        super();
        this.config = config;
    }
    isAvailable() {
        return !!(this.config.apiKey && this.config.searchEngineId);
    }
    async performSearch(query, signal) {
        const params = new URLSearchParams({
            key: this.config.apiKey,
            cx: this.config.searchEngineId,
            q: query,
            num: String(this.config.maxResults || 10),
            safe: this.config.safeSearch || 'medium'
        });
        if (this.config.language) {
            params.append('lr', `lang_${this.config.language}`);
        }
        if (this.config.country) {
            params.append('cr', `country${this.config.country}`);
        }
        const url = `https://www.googleapis.com/customsearch/v1?${params.toString()}`;
        const response = await fetch(url, {
            method: 'GET',
            signal
        });
        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`API error: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`);
        }
        const data = (await response.json());
        const results = (data.items || []).map((item) => ({
            title: item.title,
            url: item.link,
            content: item.snippet
        }));
        return {
            query,
            results
        };
    }
}
//# sourceMappingURL=google-provider.js.map