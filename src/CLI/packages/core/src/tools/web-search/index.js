/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import { createDebugLogger } from '../../utils/debugLogger.js';
import { getErrorMessage } from '../../utils/errors.js';
import { ToolErrorType } from '../tool-error.js';
import { ToolDisplayNames, ToolNames } from '../tool-names.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from '../tools.js';
import { DashScopeProvider } from './providers/dashscope-provider.js';
import { GoogleProvider } from './providers/google-provider.js';
import { TavilyProvider } from './providers/tavily-provider.js';
import { buildContentWithSources } from './utils.js';
const debugLogger = createDebugLogger('WEB_SEARCH');
class WebSearchToolInvocation extends BaseToolInvocation {
    config;
    constructor(config, params) {
        super(params);
        this.config = config;
    }
    getDescription() {
        const webSearchConfig = this.config.getWebSearchConfig();
        if (!webSearchConfig) {
            return ' (Web search is disabled - configure a provider in settings.json)';
        }
        const provider = this.params.provider || webSearchConfig.default;
        return ` (Searching the web via ${provider})`;
    }
    /**
     * WebSearch requires confirmation for external network requests.
     */
    async getDefaultPermission() {
        return 'ask';
    }
    /**
     * Constructs the web search confirmation details.
     */
    async getConfirmationDetails(_abortSignal) {
        // Extract the domain for the permission rule.
        const permissionRules = [`WebSearch`];
        const confirmationDetails = {
            type: 'info',
            title: 'Confirm Web Search',
            prompt: `Search the web for: "${this.params.query}"`,
            permissionRules,
            onConfirm: async (_outcome, _payload) => {
                // No-op: persistence is handled by coreToolScheduler via PM rules
            }
        };
        return confirmationDetails;
    }
    /**
     * Create a provider instance from configuration.
     */
    createProvider(config) {
        switch (config.type) {
            case 'tavily':
                return new TavilyProvider(config);
            case 'google':
                return new GoogleProvider(config);
            case 'dashscope': {
                // Pass auth type to DashScope provider for availability check
                const authType = this.config.getAuthType();
                const dashscopeConfig = {
                    ...config,
                    authType: authType
                };
                return new DashScopeProvider(dashscopeConfig);
            }
            default:
                throw new Error('Unknown provider type');
        }
    }
    /**
     * Create all configured providers.
     */
    createProviders(configs) {
        const providers = new Map();
        for (const config of configs) {
            try {
                const provider = this.createProvider(config);
                if (provider.isAvailable()) {
                    providers.set(config.type, provider);
                }
            }
            catch (error) {
                debugLogger.warn(`Failed to create ${config.type} provider:`, error);
            }
        }
        return providers;
    }
    /**
     * Select the appropriate provider based on configuration and parameters.
     * Throws error if provider not found.
     */
    selectProvider(providers, requestedProvider, defaultProvider) {
        // Use requested provider if specified
        if (requestedProvider) {
            const provider = providers.get(requestedProvider);
            if (!provider) {
                const available = Array.from(providers.keys()).join(', ');
                throw new Error(`The specified provider "${requestedProvider}" is not available. Available: ${available}`);
            }
            return provider;
        }
        // Use default provider if specified and available
        if (defaultProvider && providers.has(defaultProvider)) {
            return providers.get(defaultProvider);
        }
        // Fallback to first available provider
        const firstProvider = providers.values().next().value;
        if (!firstProvider) {
            throw new Error('No web search providers are available.');
        }
        return firstProvider;
    }
    /**
     * Format search results into a content string.
     */
    formatSearchResults(searchResult) {
        const sources = searchResult.results.map((r) => ({
            title: r.title,
            url: r.url
        }));
        let content = searchResult.answer?.trim() || '';
        if (!content) {
            // Fallback: Build an informative summary with title + snippet + source link
            // This provides enough context for the LLM while keeping token usage efficient
            content = searchResult.results
                .slice(0, 5) // Top 5 results
                .map((r, i) => {
                const parts = [`${i + 1}. **${r.title}**`];
                // Include snippet/content if available
                if (r.content?.trim()) {
                    parts.push(`   ${r.content.trim()}`);
                }
                // Always include the source URL
                parts.push(`   Source: ${r.url}`);
                // Optionally include relevance score if available
                if (r.score !== undefined) {
                    parts.push(`   Relevance: ${(r.score * 100).toFixed(0)}%`);
                }
                // Optionally include publish date if available
                if (r.publishedDate) {
                    parts.push(`   Published: ${r.publishedDate}`);
                }
                return parts.join('\n');
            })
                .join('\n\n');
            // Add a note about using web_fetch for detailed content
            if (content) {
                content +=
                    '\n\n*Note: For detailed content from any source above, use the web_fetch tool with the URL.*';
            }
        }
        else {
            // When answer is available, append sources section
            content = buildContentWithSources(content, sources);
        }
        return { content, sources };
    }
    async execute(signal) {
        // Check if web search is configured
        const webSearchConfig = this.config.getWebSearchConfig();
        if (!webSearchConfig) {
            return {
                llmContent: 'Web search is disabled. Please configure a web search provider in your settings.',
                returnDisplay: 'Web search is disabled.',
                error: {
                    message: 'Web search is disabled',
                    type: ToolErrorType.EXECUTION_FAILED
                }
            };
        }
        try {
            // Create and select provider
            const providers = this.createProviders(webSearchConfig.provider);
            const provider = this.selectProvider(providers, this.params.provider, webSearchConfig.default);
            // Perform search
            const searchResult = await provider.search(this.params.query, signal);
            const { content, sources } = this.formatSearchResults(searchResult);
            // Guard: Check if we got results
            if (!content.trim()) {
                return {
                    llmContent: `No search results found for query: "${this.params.query}" (via ${provider.name})`,
                    returnDisplay: `No information found for "${this.params.query}".`
                };
            }
            // Success result
            return {
                llmContent: `Web search results for "${this.params.query}" (via ${provider.name}):\n\n${content}`,
                returnDisplay: `Search results for "${this.params.query}".`,
                sources
            };
        }
        catch (error) {
            const errorMessage = `Error during web search: ${getErrorMessage(error)}`;
            debugLogger.error(errorMessage, error);
            return {
                llmContent: errorMessage,
                returnDisplay: 'Error performing web search.',
                error: {
                    message: errorMessage,
                    type: ToolErrorType.EXECUTION_FAILED
                }
            };
        }
    }
}
/**
 * A tool to perform web searches using configurable providers.
 */
export class WebSearchTool extends BaseDeclarativeTool {
    config;
    static Name = ToolNames.WEB_SEARCH;
    constructor(config) {
        super(WebSearchTool.Name, ToolDisplayNames.WEB_SEARCH, 'Allows searching the web and using results to inform responses. Provides up-to-date information for current events and recent data beyond the training data cutoff. Returns search results formatted with concise answers and source links. Use this tool when accessing information that may be outdated or beyond the knowledge cutoff.', Kind.Search, {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'The search query to find information on the web.'
                },
                provider: {
                    type: 'string',
                    description: 'Optional provider to use for the search (e.g., "tavily", "google", "dashscope"). IMPORTANT: Only specify this parameter if you explicitly know which provider to use. Otherwise, omit this parameter entirely and let the system automatically select the appropriate provider based on availability and configuration. The system will choose the best available provider automatically.'
                }
            },
            required: ['query']
        });
        this.config = config;
    }
    /**
     * Validates the parameters for the WebSearchTool.
     * @param params The parameters to validate
     * @returns An error message string if validation fails, null if valid
     */
    validateToolParamValues(params) {
        if (!params.query || params.query.trim() === '') {
            return "The 'query' parameter cannot be empty.";
        }
        // Validate provider parameter if provided
        if (params.provider !== undefined && params.provider.trim() === '') {
            return "The 'provider' parameter cannot be empty if specified.";
        }
        return null;
    }
    createInvocation(params) {
        return new WebSearchToolInvocation(this.config, params);
    }
}
//# sourceMappingURL=index.js.map