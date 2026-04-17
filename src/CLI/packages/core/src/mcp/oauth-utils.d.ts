/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { MCPOAuthConfig } from './oauth-provider.js';
/**
 * OAuth authorization server metadata as per RFC 8414.
 */
export interface OAuthAuthorizationServerMetadata {
    issuer: string;
    authorization_endpoint: string;
    token_endpoint: string;
    token_endpoint_auth_methods_supported?: string[];
    revocation_endpoint?: string;
    revocation_endpoint_auth_methods_supported?: string[];
    registration_endpoint?: string;
    response_types_supported?: string[];
    grant_types_supported?: string[];
    code_challenge_methods_supported?: string[];
    scopes_supported?: string[];
}
/**
 * OAuth protected resource metadata as per RFC 9728.
 */
export interface OAuthProtectedResourceMetadata {
    resource: string;
    authorization_servers?: string[];
    bearer_methods_supported?: string[];
    resource_documentation?: string;
    resource_signing_alg_values_supported?: string[];
    resource_encryption_alg_values_supported?: string[];
    resource_encryption_enc_values_supported?: string[];
    scopes_supported?: string[];
}
/**
 * Utility class for common OAuth operations.
 */
export declare class OAuthUtils {
    /**
     * Construct well-known OAuth endpoint URLs.
     * By default, uses standard root-based well-known URLs.
     * If includePathSuffix is true, appends any path from the base URL to the well-known endpoints.
     */
    static buildWellKnownUrls(baseUrl: string, includePathSuffix?: boolean): {
        protectedResource: string;
        authorizationServer: string;
    };
    /**
     * Fetch OAuth protected resource metadata.
     *
     * @param resourceMetadataUrl The protected resource metadata URL
     * @returns The protected resource metadata or null if not available
     */
    static fetchProtectedResourceMetadata(resourceMetadataUrl: string): Promise<OAuthProtectedResourceMetadata | null>;
    /**
     * Fetch OAuth authorization server metadata.
     *
     * @param authServerMetadataUrl The authorization server metadata URL
     * @returns The authorization server metadata or null if not available
     */
    static fetchAuthorizationServerMetadata(authServerMetadataUrl: string): Promise<OAuthAuthorizationServerMetadata | null>;
    /**
     * Convert authorization server metadata to OAuth configuration.
     *
     * @param metadata The authorization server metadata
     * @returns The OAuth configuration
     */
    static metadataToOAuthConfig(metadata: OAuthAuthorizationServerMetadata): MCPOAuthConfig;
    /**
     * Discover Oauth Authorization server metadata given an Auth server URL, by
     * trying the standard well-known endpoints.
     *
     * @param authServerUrl The authorization server URL
     * @returns The authorization server metadata or null if not found
     */
    static discoverAuthorizationServerMetadata(authServerUrl: string): Promise<OAuthAuthorizationServerMetadata | null>;
    /**
     * Discover OAuth configuration using the standard well-known endpoints.
     *
     * @param serverUrl The base URL of the server
     * @returns The discovered OAuth configuration or null if not available
     */
    static discoverOAuthConfig(serverUrl: string): Promise<MCPOAuthConfig | null>;
    /**
     * Parse WWW-Authenticate header to extract OAuth information.
     *
     * @param header The WWW-Authenticate header value
     * @returns The resource metadata URI if found
     */
    static parseWWWAuthenticateHeader(header: string): string | null;
    /**
     * Discover OAuth configuration from WWW-Authenticate header.
     *
     * @param wwwAuthenticate The WWW-Authenticate header value
     * @returns The discovered OAuth configuration or null if not available
     */
    static discoverOAuthFromWWWAuthenticate(wwwAuthenticate: string): Promise<MCPOAuthConfig | null>;
    /**
     * Extract base URL from an MCP server URL.
     *
     * @param mcpServerUrl The MCP server URL
     * @returns The base URL
     */
    static extractBaseUrl(mcpServerUrl: string): string;
    /**
     * Check if a URL is an SSE endpoint.
     *
     * @param url The URL to check
     * @returns True if the URL appears to be an SSE endpoint
     */
    static isSSEEndpoint(url: string): boolean;
    /**
     * Build a resource parameter for OAuth requests.
     *
     * Per MCP spec and RFC 8707, the resource parameter MUST be the
     * canonical URI of the MCP server. Clients SHOULD provide the most
     * specific URI they can. The URI MUST NOT include a fragment and
     * SHOULD NOT include a query component.
     *
     * @param endpointUrl The MCP server endpoint URL
     * @returns The canonical resource URI
     */
    static buildResourceParameter(endpointUrl: string): string;
}
