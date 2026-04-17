/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import type { CountTokensParameters, CountTokensResponse, EmbedContentParameters, EmbedContentResponse, GenerateContentParameters, GenerateContentResponse } from '@google/genai';
import type { Config } from '../config/config.js';
import type { ContentGeneratorConfig } from '../core/contentGenerator.js';
import { OpenAIContentGenerator } from '../core/openaiContentGenerator/index.js';
import type { IAetherOAuth2Client } from './aetherOAuth2.js';
/**
 * Qwen Content Generator that uses Aether OAuth tokens with automatic refresh
 */
export declare class AetherContentGenerator extends OpenAIContentGenerator {
    private readonly debugLogger;
    private aetherClient;
    private sharedManager;
    private currentToken?;
    constructor(aetherClient: IAetherOAuth2Client, contentGeneratorConfig: ContentGeneratorConfig, cliConfig: Config);
    /**
     * Get the current endpoint URL with proper protocol and /v1 suffix
     */
    private getCurrentEndpoint;
    /**
     * Override error logging behavior to suppress auth errors during token refresh
     */
    protected shouldSuppressErrorLogging(error: unknown, _request: GenerateContentParameters): boolean;
    /**
     * Get valid token and endpoint using the shared token manager
     */
    private getValidToken;
    /**
     * Execute an operation with automatic credential management and retry logic.
     * This method handles:
     * - Dynamic token and endpoint retrieval
     * - Client configuration updates
     * - Retry logic on authentication errors with token refresh
     *
     * @param operation - The operation to execute with updated client configuration
     * @returns The result of the operation
     */
    private executeWithCredentialManagement;
    /**
     * Override to use dynamic token and endpoint with automatic retry
     */
    generateContent(request: GenerateContentParameters, userPromptId: string): Promise<GenerateContentResponse>;
    /**
     * Override to use dynamic token and endpoint with automatic retry
     */
    generateContentStream(request: GenerateContentParameters, userPromptId: string): Promise<AsyncGenerator<GenerateContentResponse>>;
    /**
     * Override to use dynamic token and endpoint with automatic retry
     */
    countTokens(request: CountTokensParameters): Promise<CountTokensResponse>;
    /**
     * Override to use dynamic token and endpoint with automatic retry
     */
    embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse>;
    /**
     * Check if an error is related to authentication/authorization
     */
    private isAuthError;
    /**
     * Get the current cached token (may be expired)
     */
    getCurrentToken(): string | null;
    /**
     * Clear the cached token
     */
    clearToken(): void;
}
