/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type CountTokensParameters, type CountTokensResponse, type EmbedContentParameters, type EmbedContentResponse, type GenerateContentParameters, GenerateContentResponse } from '@google/genai';
import type { Config } from '../../config/config.js';
import type { ContentGenerator, ContentGeneratorConfig } from '../contentGenerator.js';
/**
 * A decorator that wraps a ContentGenerator to add logging to API calls.
 */
export declare class LoggingContentGenerator implements ContentGenerator {
    private readonly wrapped;
    private readonly config;
    private openaiLogger?;
    private schemaCompliance?;
    private modalities?;
    constructor(wrapped: ContentGenerator, config: Config, generatorConfig: ContentGeneratorConfig);
    getWrapped(): ContentGenerator;
    private logApiRequest;
    private _logApiResponse;
    private _logApiError;
    generateContent(req: GenerateContentParameters, userPromptId: string): Promise<GenerateContentResponse>;
    generateContentStream(req: GenerateContentParameters, userPromptId: string): Promise<AsyncGenerator<GenerateContentResponse>>;
    private loggingStreamWrapper;
    private buildOpenAIRequestForLogging;
    private logOpenAIInteraction;
    private convertGeminiResponseToOpenAIForLogging;
    private consolidateGeminiResponsesForLogging;
    countTokens(req: CountTokensParameters): Promise<CountTokensResponse>;
    embedContent(req: EmbedContentParameters): Promise<EmbedContentResponse>;
    useSummarizedThinking(): boolean;
    private toContents;
    private toContent;
    private toParts;
    private toPart;
}
