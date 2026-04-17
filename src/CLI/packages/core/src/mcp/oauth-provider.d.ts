/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { EventEmitter } from 'node:events';
import { MCPOAuthTokenStorage } from './oauth-token-storage.js';
import type { OAuthToken } from './token-storage/types.js';
export declare const OAUTH_DISPLAY_MESSAGE_EVENT: "oauth-display-message";
/**
 * Structured display message for i18n support.
 * The `key` is the i18n translation key (English text as key).
 * The `params` are optional interpolation parameters.
 */
export interface OAuthDisplayMessage {
    key: string;
    params?: Record<string, string>;
}
/** Payload type for OAuth display message events: structured i18n message or plain string. */
export type OAuthDisplayPayload = string | OAuthDisplayMessage;
/**
 * OAuth configuration for an MCP server.
 */
export interface MCPOAuthConfig {
    enabled?: boolean;
    clientId?: string;
    clientSecret?: string;
    authorizationUrl?: string;
    tokenUrl?: string;
    scopes?: string[];
    audiences?: string[];
    redirectUri?: string;
    tokenParamName?: string;
    registrationUrl?: string;
}
/**
 * OAuth authorization response.
 */
export interface OAuthAuthorizationResponse {
    code: string;
    state: string;
}
/**
 * OAuth token response from the authorization server.
 */
export interface OAuthTokenResponse {
    access_token: string;
    token_type: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
}
/**
 * Dynamic client registration request.
 */
export interface OAuthClientRegistrationRequest {
    client_name: string;
    redirect_uris: string[];
    grant_types: string[];
    response_types: string[];
    token_endpoint_auth_method: string;
    code_challenge_method?: string[];
    scope?: string;
}
/**
 * Dynamic client registration response.
 */
export interface OAuthClientRegistrationResponse {
    client_id: string;
    client_secret?: string;
    client_id_issued_at?: number;
    client_secret_expires_at?: number;
    redirect_uris: string[];
    grant_types: string[];
    response_types: string[];
    token_endpoint_auth_method: string;
    code_challenge_method?: string[];
    scope?: string;
}
/**
 * Provider for handling OAuth authentication for MCP servers.
 */
export declare class MCPOAuthProvider {
    private readonly tokenStorage;
    constructor(tokenStorage?: MCPOAuthTokenStorage);
    /**
     * Register a client dynamically with the OAuth server.
     *
     * @param registrationUrl The client registration endpoint URL
     * @param config OAuth configuration
     * @returns The registered client information
     */
    private registerClient;
    /**
     * Discover OAuth configuration from an MCP server URL.
     *
     * @param mcpServerUrl The MCP server URL
     * @returns OAuth configuration if discovered, null otherwise
     */
    private discoverOAuthFromMCPServer;
    /**
     * Generate PKCE parameters for OAuth flow.
     *
     * @returns PKCE parameters including code verifier, challenge, and state
     */
    private generatePKCEParams;
    /**
     * Start a local HTTP server to handle OAuth callback.
     *
     * @param expectedState The state parameter to validate
     * @returns Promise that resolves with the authorization code
     */
    private startCallbackServer;
    /**
     * Build the authorization URL with PKCE parameters.
     *
     * @param config OAuth configuration
     * @param pkceParams PKCE parameters
     * @param mcpServerUrl The MCP server URL to use as the resource parameter
     * @returns The authorization URL
     */
    private buildAuthorizationUrl;
    /**
     * Exchange authorization code for tokens.
     *
     * @param config OAuth configuration
     * @param code Authorization code
     * @param codeVerifier PKCE code verifier
     * @param mcpServerUrl The MCP server URL to use as the resource parameter
     * @returns The token response
     */
    private exchangeCodeForToken;
    /**
     * Refresh an access token using a refresh token.
     *
     * @param config OAuth configuration
     * @param refreshToken The refresh token
     * @param tokenUrl The token endpoint URL
     * @param mcpServerUrl The MCP server URL to use as the resource parameter
     * @returns The new token response
     */
    refreshAccessToken(config: MCPOAuthConfig, refreshToken: string, tokenUrl: string, mcpServerUrl?: string): Promise<OAuthTokenResponse>;
    /**
     * Perform the full OAuth authorization code flow with PKCE.
     *
     * @param serverName The name of the MCP server
     * @param config OAuth configuration
     * @param mcpServerUrl Optional MCP server URL for OAuth discovery
     * @param messageHandler Optional handler for displaying user-facing messages
     * @returns The obtained OAuth token
     */
    authenticate(serverName: string, config: MCPOAuthConfig, mcpServerUrl?: string, events?: EventEmitter): Promise<OAuthToken>;
    /**
     * Get a valid access token for an MCP server, refreshing if necessary.
     *
     * @param serverName The name of the MCP server
     * @param config OAuth configuration
     * @returns A valid access token or null if not authenticated
     */
    getValidToken(serverName: string, config: MCPOAuthConfig): Promise<string | null>;
}
