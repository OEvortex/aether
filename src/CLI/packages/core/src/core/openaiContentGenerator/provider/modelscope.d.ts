import type OpenAI from 'openai';
import type { ContentGeneratorConfig } from '../../contentGenerator.js';
import { DefaultOpenAICompatibleProvider } from './default.js';
/**
 * Provider for ModelScope API
 */
export declare class ModelScopeOpenAICompatibleProvider extends DefaultOpenAICompatibleProvider {
    /**
     * Checks if the configuration is for ModelScope.
     */
    static isModelScopeProvider(config: ContentGeneratorConfig): boolean;
    /**
     * ModelScope does not support `stream_options` when `stream` is false.
     * This method removes `stream_options` if `stream` is not true.
     */
    buildRequest(request: OpenAI.Chat.ChatCompletionCreateParams, userPromptId: string): OpenAI.Chat.ChatCompletionCreateParams;
}
