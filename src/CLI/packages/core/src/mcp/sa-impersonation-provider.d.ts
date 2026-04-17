/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import type { OAuthClientInformation, OAuthClientInformationFull, OAuthClientMetadata, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { MCPServerConfig } from '../config/config.js';
export declare class ServiceAccountImpersonationProvider implements OAuthClientProvider {
    private readonly config;
    private readonly targetServiceAccount;
    private readonly targetAudience;
    private readonly auth;
    private cachedToken?;
    private tokenExpiryTime?;
    readonly redirectUrl = "";
    readonly clientMetadata: OAuthClientMetadata;
    private _clientInformation?;
    constructor(config: MCPServerConfig);
    clientInformation(): OAuthClientInformation | undefined;
    saveClientInformation(clientInformation: OAuthClientInformationFull): void;
    tokens(): Promise<OAuthTokens | undefined>;
    saveTokens(_tokens: OAuthTokens): void;
    redirectToAuthorization(_authorizationUrl: URL): void;
    saveCodeVerifier(_codeVerifier: string): void;
    codeVerifier(): string;
    /**
     * Parses a JWT string to extract its expiry time.
     * @param idToken The JWT ID token.
     * @returns The expiry time in **milliseconds**, or undefined if parsing fails.
     */
    private parseTokenExpiry;
}
