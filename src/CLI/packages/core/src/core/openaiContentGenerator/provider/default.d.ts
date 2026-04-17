import type { GenerateContentConfig } from '@google/genai';
import OpenAI from 'openai';
import type { Config } from '../../../config/config.js';
import type { ContentGeneratorConfig } from '../../contentGenerator.js';
import type { OpenAICompatibleProvider } from './types.js';
/**
 * Default provider for standard OpenAI-compatible APIs
 */
export declare class DefaultOpenAICompatibleProvider implements OpenAICompatibleProvider {
    protected contentGeneratorConfig: ContentGeneratorConfig;
    protected cliConfig: Config;
    constructor(contentGeneratorConfig: ContentGeneratorConfig, cliConfig: Config);
    buildHeaders(): Record<string, string | undefined>;
    buildClient(): OpenAI;
    buildRequest(request: OpenAI.Chat.ChatCompletionCreateParams, _userPromptId: string): OpenAI.Chat.ChatCompletionCreateParams;
    getDefaultGenerationConfig(): GenerateContentConfig;
    /**
     * Apply output token limit to a request's max_tokens parameter.
     *
     * Purpose:
     * Some APIs (e.g., OpenAI-compatible) default to a very small max_tokens value,
     * which can cause responses to be truncated mid-output. This function ensures
     * a reasonable default is set while respecting user configuration.
     *
     * Logic:
     * 1. If user explicitly configured max_tokens:
     *    - For known models (in OUTPUT_PATTERNS): use the user's value, but cap at
     *      model's max output limit to avoid API errors
     *      (input + max_output > contextWindowSize would cause 400 errors on some APIs)
     *    - For unknown models (deployment aliases, self-hosted): respect user's
     *      configured value entirely (backend may support larger limits)
     * 2. If user didn't configure max_tokens:
     *    - Use min(modelLimit, DEFAULT_OUTPUT_TOKEN_LIMIT)
     *    - This provides a conservative default (32K) that avoids truncating output
     *      while preserving input quota (not occupying too much context window)
     * 3. If model has no specific limit (tokenLimit returns default):
     *    - Still apply DEFAULT_OUTPUT_TOKEN_LIMIT as safeguard
     *
     * Examples:
     * - User sets 4K, known model limit 64K → uses 4K (respects user preference)
     * - User sets 100K, known model limit 64K → uses 64K (capped to avoid API error)
     * - User sets 100K, unknown model → uses 100K (respects user, backend may support it)
     * - User not set, model limit 64K → uses 32K (conservative default)
     * - User not set, model limit 8K → uses 8K (model limit is lower)
     *
     * @param request - The chat completion request parameters
     * @returns The request with max_tokens adjusted according to the logic
     */
    protected applyOutputTokenLimit<T extends {
        max_tokens?: number | null;
        model: string;
    }>(request: T): T;
}
