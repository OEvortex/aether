/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { CountTokensParameters, CountTokensResponse, EmbedContentParameters, EmbedContentResponse, GenerateContentParameters, GenerateContentResponse } from '@google/genai';
import type { Config } from '../config/config.js';
import type { ConfigSource, ConfigSourceKind, ConfigSources } from '../utils/configResolver.js';
/**
 * Interface abstracting the core functionalities for generating content and counting tokens.
 */
export interface ContentGenerator {
    generateContent(request: GenerateContentParameters, userPromptId: string): Promise<GenerateContentResponse>;
    generateContentStream(request: GenerateContentParameters, userPromptId: string): Promise<AsyncGenerator<GenerateContentResponse>>;
    countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;
    embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;
    useSummarizedThinking(): boolean;
}
export declare enum AuthType {
    USE_OPENAI = "openai",
    AETHER_OAUTH = "aether-oauth",
    USE_GEMINI = "gemini",
    USE_VERTEX_AI = "vertex-ai",
    USE_ANTHROPIC = "anthropic"
}
/**
 * Supported input modalities for a model.
 * Omitted or false fields mean the model does not support that input type.
 */
export type InputModalities = {
    image?: boolean;
    pdf?: boolean;
    audio?: boolean;
    video?: boolean;
};
export type ContentGeneratorConfig = {
    model: string;
    apiKey?: string;
    apiKeyEnvKey?: string;
    baseUrl?: string;
    vertexai?: boolean;
    authType?: AuthType | undefined;
    enableOpenAILogging?: boolean;
    openAILoggingDir?: string;
    timeout?: number;
    maxRetries?: number;
    retryErrorCodes?: number[];
    enableCacheControl?: boolean;
    samplingParams?: {
        top_p?: number;
        top_k?: number;
        repetition_penalty?: number;
        presence_penalty?: number;
        frequency_penalty?: number;
        temperature?: number;
        max_tokens?: number;
    };
    reasoning?: false | {
        effort?: 'low' | 'medium' | 'high';
        budget_tokens?: number;
    };
    proxy?: string | undefined;
    userAgent?: string;
    schemaCompliance?: 'auto' | 'openapi_30';
    contextWindowSize?: number;
    customHeaders?: Record<string, string>;
    extra_body?: Record<string, unknown>;
    modalities?: InputModalities;
};
export type ContentGeneratorConfigSourceKind = ConfigSourceKind;
export type ContentGeneratorConfigSource = ConfigSource;
export type ContentGeneratorConfigSources = ConfigSources;
export type ResolvedContentGeneratorConfig = {
    config: ContentGeneratorConfig;
    sources: ContentGeneratorConfigSources;
};
/**
 * Resolve ContentGeneratorConfig while tracking the source of each effective field.
 *
 * This function now primarily validates and finalizes the configuration that has
 * already been resolved by ModelConfigResolver. The env fallback logic has been
 * moved to the unified resolver to eliminate duplication.
 *
 * Note: The generationConfig passed here should already be fully resolved with
 * proper source tracking from the caller (CLI/SDK layer).
 */
export declare function resolveContentGeneratorConfigWithSources(config: Config, authType: AuthType | undefined, generationConfig?: Partial<ContentGeneratorConfig>, seedSources?: ContentGeneratorConfigSources, options?: {
    strictModelProvider?: boolean;
}): ResolvedContentGeneratorConfig;
export interface ModelConfigValidationResult {
    valid: boolean;
    errors: Error[];
}
/**
 * Validate a resolved model configuration.
 * This is the single validation entry point used across Core.
 */
export declare function validateModelConfig(config: ContentGeneratorConfig, isStrictModelProvider?: boolean): ModelConfigValidationResult;
export declare function createContentGeneratorConfig(config: Config, authType: AuthType | undefined, generationConfig?: Partial<ContentGeneratorConfig>): ContentGeneratorConfig;
export declare function createContentGenerator(generatorConfig: ContentGeneratorConfig, config: Config, isInitialAuth?: boolean): Promise<ContentGenerator>;
