/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { CountTokensParameters, CountTokensResponse, EmbedContentParameters, EmbedContentResponse, GenerateContentParameters, GenerateContentResponse } from '@google/genai';
import type { ContentGenerator, ContentGeneratorConfig } from '../contentGenerator.js';
/**
 * A wrapper for GoogleGenAI that implements the ContentGenerator interface.
 */
export declare class GeminiContentGenerator implements ContentGenerator {
    private readonly googleGenAI;
    private readonly contentGeneratorConfig?;
    constructor(options: {
        apiKey?: string;
        vertexai?: boolean;
        httpOptions?: {
            headers: Record<string, string>;
        };
    }, contentGeneratorConfig?: ContentGeneratorConfig);
    private buildGenerateContentConfig;
    private buildThinkingConfig;
    generateContent(request: GenerateContentParameters, _userPromptId: string): Promise<GenerateContentResponse>;
    generateContentStream(request: GenerateContentParameters, _userPromptId: string): Promise<AsyncGenerator<GenerateContentResponse>>;
    /**
     * Strip fields not supported by Gemini API (e.g., displayName in inlineData/fileData)
     */
    private stripUnsupportedFields;
    private stripContentFields;
    private stripPartFields;
    /**
     * Convert unsupported media types (audio, video) to explanatory text for Gemini API
     */
    private convertUnsupportedMediaToText;
    countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;
    embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;
    useSummarizedThinking(): boolean;
}
