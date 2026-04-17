import type { GenerateContentConfig } from '@google/genai';
import OpenAI from 'openai';
import type { ContentGeneratorConfig } from '../../contentGenerator.js';
import { DefaultOpenAICompatibleProvider } from './default.js';
import type { DashScopeRequestMetadata } from './types.js';
export declare class DashScopeOpenAICompatibleProvider extends DefaultOpenAICompatibleProvider {
    static isDashScopeProvider(contentGeneratorConfig: ContentGeneratorConfig): boolean;
    buildHeaders(): Record<string, string | undefined>;
    buildClient(): OpenAI;
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
    buildRequest(request: OpenAI.Chat.ChatCompletionCreateParams, userPromptId: string): OpenAI.Chat.ChatCompletionCreateParams;
    buildMetadata(userPromptId: string): DashScopeRequestMetadata;
    getDefaultGenerationConfig(): GenerateContentConfig;
    /**
     * Add cache control flag to specified message(s) for DashScope providers
     */
    private addDashScopeCacheControl;
    private addCacheControlToTools;
    /**
     * Add cache control to message content, handling both string and array formats
     */
    private addCacheControlToContent;
    /**
     * Normalize content to array format
     */
    private normalizeContentToArray;
    /**
     * Add cache control to the content array
     */
    private addCacheControlToContentArray;
    /**
     * Vision-capable model patterns.
     * Supports exact matches and prefix patterns for easy extension.
     */
    private static readonly VISION_MODEL_EXACT_MATCHES;
    private static readonly VISION_MODEL_PREFIX_PATTERNS;
    private isVisionModel;
    /**
     * Check if cache control should be disabled based on configuration.
     *
     * @returns true if cache control should be enabled, false otherwise
     */
    private shouldEnableCacheControl;
}
