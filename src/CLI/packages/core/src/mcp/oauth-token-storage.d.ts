/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { OAuthCredentials, OAuthToken, TokenStorage } from './token-storage/types.js';
/**
 * Class for managing MCP OAuth token storage and retrieval.
 */
export declare class MCPOAuthTokenStorage implements TokenStorage {
    private readonly hybridTokenStorage;
    private readonly useEncryptedFile;
    /**
     * Get the path to the token storage file.
     *
     * @returns The full path to the token storage file
     */
    private getTokenFilePath;
    /**
     * Ensure the config directory exists.
     */
    private ensureConfigDir;
    /**
     * Load all stored MCP OAuth tokens.
     *
     * @returns A map of server names to credentials
     */
    getAllCredentials(): Promise<Map<string, OAuthCredentials>>;
    listServers(): Promise<string[]>;
    setCredentials(credentials: OAuthCredentials): Promise<void>;
    /**
     * Save a token for a specific MCP server.
     *
     * @param serverName The name of the MCP server
     * @param token The OAuth token to save
     * @param clientId Optional client ID used for this token
     * @param tokenUrl Optional token URL used for this token
     * @param mcpServerUrl Optional MCP server URL
     */
    saveToken(serverName: string, token: OAuthToken, clientId?: string, tokenUrl?: string, mcpServerUrl?: string): Promise<void>;
    /**
     * Get a token for a specific MCP server.
     *
     * @param serverName The name of the MCP server
     * @returns The stored credentials or null if not found
     */
    getCredentials(serverName: string): Promise<OAuthCredentials | null>;
    /**
     * Remove a token for a specific MCP server.
     *
     * @param serverName The name of the MCP server
     */
    deleteCredentials(serverName: string): Promise<void>;
    /**
     * Check if a token is expired.
     *
     * @param token The token to check
     * @returns True if the token is expired
     */
    isTokenExpired(token: OAuthToken): boolean;
    /**
     * Clear all stored MCP OAuth tokens.
     */
    clearAll(): Promise<void>;
}
