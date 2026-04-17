/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import type { CountTokensParameters, CountTokensResponse, EmbedContentParameters, EmbedContentResponse, GenerateContentParameters } from '@google/genai';
import { GenerateContentResponse } from '@google/genai';
import type { Config } from '../../config/config.js';
import type { ContentGenerator, ContentGeneratorConfig } from '../contentGenerator.js';
export declare class AnthropicContentGenerator implements ContentGenerator {
    private contentGeneratorConfig;
    private readonly cliConfig;
    private client;
    private converter;
    constructor(contentGeneratorConfig: ContentGeneratorConfig, cliConfig: Config);
    generateContent(request: GenerateContentParameters): Promise<GenerateContentResponse>;
    generateContentStream(request: GenerateContentParameters): Promise<AsyncGenerator<GenerateContentResponse>>;
    countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;
    embedContent(_request: EmbedContentParameters): Promise<EmbedContentResponse>;
    useSummarizedThinking(): boolean;
    private buildHeaders;
    private buildRequest;
    private buildSamplingParameters;
    private buildThinkingConfig;
    private buildOutputConfig;
    private processStream;
    private buildGeminiChunk;
}
