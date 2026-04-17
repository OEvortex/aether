/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import { type GenerateContentParameters, GenerateContentResponse } from '@google/genai';
import type OpenAI from 'openai';
import type { Config } from '../../config/config.js';
import type { ContentGeneratorConfig } from '../contentGenerator.js';
import type { ErrorHandler } from './errorHandler.js';
import type { OpenAICompatibleProvider } from './provider/index.js';
/**
 * Error thrown when the API returns an error embedded as stream content
 * instead of a proper HTTP error. Some providers (e.g., certain OpenAI-compatible
 * endpoints) return throttling errors as a normal SSE chunk with
 * finish_reason="error_finish" and the error message in delta.content.
 */
export declare class StreamContentError extends Error {
    constructor(message: string);
}
export interface PipelineConfig {
    cliConfig: Config;
    provider: OpenAICompatibleProvider;
    contentGeneratorConfig: ContentGeneratorConfig;
    errorHandler: ErrorHandler;
}
export declare class ContentGenerationPipeline {
    private config;
    client: OpenAI;
    private converter;
    private contentGeneratorConfig;
    constructor(config: PipelineConfig);
    execute(request: GenerateContentParameters, userPromptId: string): Promise<GenerateContentResponse>;
    executeStream(request: GenerateContentParameters, userPromptId: string): Promise<AsyncGenerator<GenerateContentResponse>>;
    /**
     * Stage 2: Process OpenAI stream with conversion and logging
     * This method handles the complete stream processing pipeline:
     * 1. Convert OpenAI chunks to Gemini format while preserving original chunks
     * 2. Filter empty responses
     * 3. Handle chunk merging for providers that send finishReason and usageMetadata separately
     * 4. Collect both formats for logging
     * 5. Handle success/error logging
     */
    private processStreamWithLogging;
    /**
     * Handle chunk merging for providers that send finishReason and usageMetadata separately.
     *
     * Strategy: When we encounter a finishReason chunk, we hold it and merge all subsequent
     * chunks into it until the stream ends. This ensures the final chunk contains both
     * finishReason and the most up-to-date usage information from any provider pattern.
     *
     * @param response Current Gemini response
     * @param collectedGeminiResponses Array to collect responses for logging
     * @param setPendingFinish Callback to set pending finish response
     * @returns true if the response should be yielded, false if it should be held for merging
     */
    private handleChunkMerging;
    private buildRequest;
    private buildGenerateContentConfig;
    private buildReasoningConfig;
    /**
     * Common error handling wrapper for execute methods
     */
    private executeWithErrorHandling;
    /**
     * Shared error handling logic for both executeWithErrorHandling and processStreamWithLogging
     * This centralizes the common error processing steps to avoid duplication
     */
    private handleError;
    /**
     * Create request context with common properties
     */
    private createRequestContext;
}
