import OpenAI from 'openai';
import { buildRuntimeFetchOptions } from '../../../utils/runtimeFetchOptions.js';
import { AuthType } from '../../contentGenerator.js';
import { DEFAULT_DASHSCOPE_BASE_URL, DEFAULT_MAX_RETRIES, DEFAULT_TIMEOUT } from '../constants.js';
import { DefaultOpenAICompatibleProvider } from './default.js';
export class DashScopeOpenAICompatibleProvider extends DefaultOpenAICompatibleProvider {
    static isDashScopeProvider(contentGeneratorConfig) {
        const { authType, baseUrl } = contentGeneratorConfig;
        if (authType === AuthType.AETHER_OAUTH) {
            return true;
        }
        if (!baseUrl) {
            return true;
        }
        // Matches: dashscope.aliyuncs.com, *.dashscope.aliyuncs.com, or *.dashscope-intl.aliyuncs.com
        return /([\w-]+\.)?dashscope(-intl)?\.aliyuncs\.com/i.test(baseUrl);
    }
    buildHeaders() {
        const version = this.cliConfig.getCliVersion() || 'unknown';
        const userAgent = `AetherCode/${version} (${process.platform}; ${process.arch})`;
        const { authType, customHeaders } = this.contentGeneratorConfig;
        const defaultHeaders = {
            'User-Agent': userAgent,
            'X-DashScope-CacheControl': 'enable',
            'X-DashScope-UserAgent': userAgent,
            'X-DashScope-AuthType': authType
        };
        return customHeaders
            ? { ...defaultHeaders, ...customHeaders }
            : defaultHeaders;
    }
    buildClient() {
        const { apiKey, baseUrl = DEFAULT_DASHSCOPE_BASE_URL, timeout = DEFAULT_TIMEOUT, maxRetries = DEFAULT_MAX_RETRIES } = this.contentGeneratorConfig;
        const defaultHeaders = this.buildHeaders();
        // Configure fetch options to ensure user-configured timeout works as expected
        // bodyTimeout is always disabled (0) to let OpenAI SDK timeout control the request
        const runtimeOptions = buildRuntimeFetchOptions('openai', this.cliConfig.getProxy());
        return new OpenAI({
            apiKey,
            baseURL: baseUrl,
            timeout,
            maxRetries,
            defaultHeaders,
            ...(runtimeOptions || {})
        });
    }
    /**
     * Build and configure the request for DashScope API.
     *
     * This method applies DashScope-specific configurations including:
     * - Cache control for the system message, last tool message (when tools are configured),
     *   and the latest history message
     * - Output token limits based on model capabilities
     * - Vision model specific parameters (vl_high_resolution_images)
     * - Request metadata for session tracking
     *
     * @param request - The original chat completion request parameters
     * @param userPromptId - Unique identifier for the user prompt for session tracking
     * @returns Configured request with DashScope-specific parameters applied
     */
    buildRequest(request, userPromptId) {
        let messages = request.messages;
        let tools = request.tools;
        // Apply DashScope cache control if enabled (default is enabled).
        if (this.shouldEnableCacheControl()) {
            const { messages: updatedMessages, tools: updatedTools } = this.addDashScopeCacheControl(request, request.stream ? 'all' : 'system_only');
            messages = updatedMessages;
            tools = updatedTools;
        }
        // Apply output token limits using parent class logic
        // Uses conservative default (min of model limit and DEFAULT_MAX_OUTPUT_TOKENS)
        // to preserve input quota when user hasn't explicitly configured max_tokens
        const requestWithTokenLimits = this.applyOutputTokenLimit(request);
        const extraBody = this.contentGeneratorConfig.extra_body;
        if (this.isVisionModel(request.model)) {
            return {
                ...requestWithTokenLimits,
                messages,
                ...(tools ? { tools } : {}),
                ...(this.buildMetadata(userPromptId) || {}),
                /* @ts-expect-error dashscope exclusive */
                vl_high_resolution_images: true,
                ...(extraBody ? extraBody : {})
            };
        }
        return {
            ...requestWithTokenLimits, // Preserve all original parameters including sampling params and adjusted max_tokens
            messages,
            ...(tools ? { tools } : {}),
            ...(this.buildMetadata(userPromptId) || {}),
            ...(extraBody ? extraBody : {})
        };
    }
    buildMetadata(userPromptId) {
        const channel = this.cliConfig.getChannel?.();
        return {
            metadata: {
                sessionId: this.cliConfig.getSessionId?.(),
                promptId: userPromptId,
                ...(channel ? { channel } : {})
            }
        };
    }
    getDefaultGenerationConfig() {
        return {};
    }
    /**
     * Add cache control flag to specified message(s) for DashScope providers
     */
    addDashScopeCacheControl(request, cacheControl) {
        const messages = request.messages;
        const systemIndex = messages.findIndex((msg) => msg.role === 'system');
        const lastIndex = messages.length - 1;
        const updatedMessages = messages.length === 0
            ? messages
            : messages.map((message, index) => {
                const shouldAddCacheControl = Boolean((index === systemIndex && systemIndex !== -1) ||
                    (index === lastIndex && cacheControl === 'all'));
                if (!shouldAddCacheControl ||
                    !('content' in message) ||
                    message.content === null ||
                    message.content === undefined) {
                    return message;
                }
                return {
                    ...message,
                    content: this.addCacheControlToContent(message.content)
                };
            });
        const updatedTools = cacheControl === 'all' && request.tools?.length
            ? this.addCacheControlToTools(request.tools)
            : request.tools;
        return {
            messages: updatedMessages,
            tools: updatedTools
        };
    }
    addCacheControlToTools(tools) {
        if (tools.length === 0) {
            return tools;
        }
        const updatedTools = [...tools];
        const lastToolIndex = tools.length - 1;
        updatedTools[lastToolIndex] = {
            ...updatedTools[lastToolIndex],
            cache_control: { type: 'ephemeral' }
        };
        return updatedTools;
    }
    /**
     * Add cache control to message content, handling both string and array formats
     */
    addCacheControlToContent(content) {
        // Convert content to array format if it's a string
        const contentArray = this.normalizeContentToArray(content);
        // Add cache control to the last text item or create one if needed
        return this.addCacheControlToContentArray(contentArray);
    }
    /**
     * Normalize content to array format
     */
    normalizeContentToArray(content) {
        if (typeof content === 'string') {
            return [
                {
                    type: 'text',
                    text: content
                }
            ];
        }
        return [...content];
    }
    /**
     * Add cache control to the content array
     */
    addCacheControlToContentArray(contentArray) {
        if (contentArray.length === 0) {
            return contentArray;
        }
        // Add cache_control to the last text item
        const lastItem = contentArray[contentArray.length - 1];
        contentArray[contentArray.length - 1] = {
            ...lastItem,
            cache_control: { type: 'ephemeral' }
        };
        return contentArray;
    }
    /**
     * Vision-capable model patterns.
     * Supports exact matches and prefix patterns for easy extension.
     */
    static VISION_MODEL_EXACT_MATCHES = new Set([
        'coder-model'
    ]);
    static VISION_MODEL_PREFIX_PATTERNS = [
        'qwen-vl', // qwen-vl-max, qwen-vl-max-latest, etc.
        'aether3-vl-plus', // aether3-vl-plus variants
        'aether3.5-plus' // aether3.5-plus (has built-in vision capabilities)
    ];
    isVisionModel(model) {
        if (!model) {
            return false;
        }
        const normalized = model.toLowerCase();
        // Check exact matches
        if (DashScopeOpenAICompatibleProvider.VISION_MODEL_EXACT_MATCHES.has(normalized)) {
            return true;
        }
        // Check prefix patterns
        for (const prefix of DashScopeOpenAICompatibleProvider.VISION_MODEL_PREFIX_PATTERNS) {
            if (normalized.startsWith(prefix)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Check if cache control should be disabled based on configuration.
     *
     * @returns true if cache control should be enabled, false otherwise
     */
    shouldEnableCacheControl() {
        // Cache control is enabled by default (when enableCacheControl is undefined or true).
        return (this.cliConfig.getContentGeneratorConfig()?.enableCacheControl !==
            false);
    }
}
//# sourceMappingURL=dashscope.js.map