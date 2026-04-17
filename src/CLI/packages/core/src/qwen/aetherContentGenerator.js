/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import { DEFAULT_DASHSCOPE_BASE_URL } from '../core/openaiContentGenerator/constants.js';
import { OpenAIContentGenerator } from '../core/openaiContentGenerator/index.js';
import { DashScopeOpenAICompatibleProvider } from '../core/openaiContentGenerator/provider/dashscope.js';
import { createDebugLogger } from '../utils/debugLogger.js';
import { SharedTokenManager } from './aetherSharedTokenManager.js';
/**
 * Qwen Content Generator that uses Aether OAuth tokens with automatic refresh
 */
export class AetherContentGenerator extends OpenAIContentGenerator {
    debugLogger = createDebugLogger('AETHER');
    aetherClient;
    sharedManager;
    currentToken;
    constructor(aetherClient, contentGeneratorConfig, cliConfig) {
        // Create DashScope provider for Qwen
        const dashscopeProvider = new DashScopeOpenAICompatibleProvider(contentGeneratorConfig, cliConfig);
        // Initialize with DashScope provider
        super(contentGeneratorConfig, cliConfig, dashscopeProvider);
        this.aetherClient = aetherClient;
        this.sharedManager = SharedTokenManager.getInstance();
        // Set default base URL, will be updated dynamically
        if (contentGeneratorConfig?.baseUrl && contentGeneratorConfig?.apiKey) {
            this.pipeline.client.baseURL = contentGeneratorConfig?.baseUrl;
            this.pipeline.client.apiKey = contentGeneratorConfig?.apiKey;
        }
    }
    /**
     * Get the current endpoint URL with proper protocol and /v1 suffix
     */
    getCurrentEndpoint(resourceUrl) {
        const baseEndpoint = resourceUrl || DEFAULT_DASHSCOPE_BASE_URL;
        const suffix = '/v1';
        // Normalize the URL: add protocol if missing, ensure /v1 suffix
        const normalizedUrl = baseEndpoint.startsWith('http')
            ? baseEndpoint
            : `https://${baseEndpoint}`;
        return normalizedUrl.endsWith(suffix)
            ? normalizedUrl
            : `${normalizedUrl}${suffix}`;
    }
    /**
     * Override error logging behavior to suppress auth errors during token refresh
     */
    shouldSuppressErrorLogging(error, _request) {
        // Suppress logging for authentication errors that we handle with token refresh
        return this.isAuthError(error);
    }
    /**
     * Get valid token and endpoint using the shared token manager
     */
    async getValidToken() {
        try {
            // Use SharedTokenManager for consistent token/endpoint pairing and automatic refresh
            const credentials = await this.sharedManager.getValidCredentials(this.aetherClient);
            if (!credentials.access_token) {
                throw new Error('No access token available');
            }
            return {
                token: credentials.access_token,
                endpoint: this.getCurrentEndpoint(credentials.resource_url)
            };
        }
        catch (error) {
            // Propagate auth errors as-is for retry logic
            if (this.isAuthError(error)) {
                throw error;
            }
            this.debugLogger.warn('Failed to get token from shared manager:', error);
            throw new Error('Failed to obtain valid Qwen access token. Please re-authenticate.');
        }
    }
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
    async executeWithCredentialManagement(operation) {
        // Attempt the operation with credential management and retry logic
        const attemptOperation = async () => {
            const { token, endpoint } = await this.getValidToken();
            // Apply dynamic configuration
            this.pipeline.client.apiKey = token;
            this.pipeline.client.baseURL = endpoint;
            return await operation();
        };
        // Execute with retry logic for auth errors
        try {
            return await attemptOperation();
        }
        catch (error) {
            if (this.isAuthError(error)) {
                // Use SharedTokenManager to properly refresh and persist the token
                // This ensures the refreshed token is saved to oauth_creds.json
                await this.sharedManager.getValidCredentials(this.aetherClient, true);
                return await attemptOperation();
            }
            throw error;
        }
    }
    /**
     * Override to use dynamic token and endpoint with automatic retry
     */
    async generateContent(request, userPromptId) {
        return this.executeWithCredentialManagement(() => super.generateContent(request, userPromptId));
    }
    /**
     * Override to use dynamic token and endpoint with automatic retry
     */
    async generateContentStream(request, userPromptId) {
        return this.executeWithCredentialManagement(() => super.generateContentStream(request, userPromptId));
    }
    /**
     * Override to use dynamic token and endpoint with automatic retry
     */
    async countTokens(request) {
        return super.countTokens(request);
    }
    /**
     * Override to use dynamic token and endpoint with automatic retry
     */
    async embedContent(request) {
        return this.executeWithCredentialManagement(() => super.embedContent(request));
    }
    /**
     * Check if an error is related to authentication/authorization
     */
    isAuthError(error) {
        if (!error) {
            return false;
        }
        const errorMessage = error instanceof Error
            ? error.message.toLowerCase()
            : String(error).toLowerCase();
        // Define a type for errors that might have status or code properties
        const errorWithCode = error;
        const errorCode = errorWithCode?.status || errorWithCode?.code;
        return (errorCode === 401 ||
            errorCode === 403 ||
            errorCode === '401' ||
            errorCode === '403' ||
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('forbidden') ||
            errorMessage.includes('invalid api key') ||
            errorMessage.includes('invalid access token') ||
            errorMessage.includes('token expired') ||
            errorMessage.includes('authentication') ||
            errorMessage.includes('access denied') ||
            (errorMessage.includes('token') && errorMessage.includes('expired')));
    }
    /**
     * Get the current cached token (may be expired)
     */
    getCurrentToken() {
        // First check internal state for backwards compatibility with tests
        if (this.currentToken) {
            return this.currentToken;
        }
        // Fall back to SharedTokenManager
        const credentials = this.sharedManager.getCurrentCredentials();
        return credentials?.access_token || null;
    }
    /**
     * Clear the cached token
     */
    clearToken() {
        // Clear internal state for backwards compatibility with tests
        this.currentToken = undefined;
        // Also clear SharedTokenManager
        this.sharedManager.clearCache();
    }
}
//# sourceMappingURL=aetherContentGenerator.js.map