/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseWebSearchProvider } from '../base-provider.js';
/**
 * Web search provider using Tavily API.
 */
export class TavilyProvider extends BaseWebSearchProvider {
    config;
    name = 'Tavily';
    constructor(config) {
        super();
        this.config = config;
    }
    isAvailable() {
        return !!this.config.apiKey;
    }
    async performSearch(query, signal) {
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                api_key: this.config.apiKey,
                query,
                search_depth: this.config.searchDepth || 'advanced',
                max_results: this.config.maxResults || 5,
                include_answer: this.config.includeAnswer !== false
            }),
            signal
        });
        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`API error: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`);
        }
        const data = (await response.json());
        const results = (data.results || []).map((r) => ({
            title: r.title,
            url: r.url,
            content: r.content,
            score: r.score,
            publishedDate: r.published_date
        }));
        return {
            query,
            answer: data.answer?.trim(),
            results
        };
    }
}
//# sourceMappingURL=tavily-provider.js.map