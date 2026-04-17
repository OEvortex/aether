/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import type { GenerateContentConfig } from '@google/genai';
import type OpenAI from 'openai';
import type { ContentGeneratorConfig } from '../../contentGenerator.js';
import { DefaultOpenAICompatibleProvider } from './default.js';
export declare class DeepSeekOpenAICompatibleProvider extends DefaultOpenAICompatibleProvider {
    static isDeepSeekProvider(contentGeneratorConfig: ContentGeneratorConfig): boolean;
    /**
     * DeepSeek's API requires message content to be a plain string, not an
     * array of content parts. Flatten any text-part arrays into joined strings
     * and reject non-text parts that DeepSeek cannot handle.
     */
    buildRequest(request: OpenAI.Chat.ChatCompletionCreateParams, userPromptId: string): OpenAI.Chat.ChatCompletionCreateParams;
    getDefaultGenerationConfig(): GenerateContentConfig;
}
