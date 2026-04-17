/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleAuth } from 'google-auth-library';
import { createDebugLogger } from '../utils/debugLogger.js';
import { MCP_OAUTH_CLIENT_NAME } from './constants.js';
const debugLogger = createDebugLogger('MCP_GOOGLE_AUTH');
const ALLOWED_HOSTS = [/^.+\.googleapis\.com$/, /^(.*\.)?luci\.app$/];
export class GoogleCredentialProvider {
    config;
    auth;
    // Properties required by OAuthClientProvider, with no-op values
    redirectUrl = '';
    clientMetadata = {
        client_name: MCP_OAUTH_CLIENT_NAME,
        redirect_uris: [],
        grant_types: [],
        response_types: [],
        token_endpoint_auth_method: 'none'
    };
    _clientInformation;
    constructor(config) {
        this.config = config;
        const url = this.config?.url || this.config?.httpUrl;
        if (!url) {
            throw new Error('URL must be provided in the config for Google Credentials provider');
        }
        const hostname = new URL(url).hostname;
        if (!ALLOWED_HOSTS.some((pattern) => pattern.test(hostname))) {
            throw new Error(`Host "${hostname}" is not an allowed host for Google Credential provider.`);
        }
        const scopes = this.config?.oauth?.scopes;
        if (!scopes || scopes.length === 0) {
            throw new Error('Scopes must be provided in the oauth config for Google Credentials provider');
        }
        this.auth = new GoogleAuth({
            scopes
        });
    }
    clientInformation() {
        return this._clientInformation;
    }
    saveClientInformation(clientInformation) {
        this._clientInformation = clientInformation;
    }
    async tokens() {
        const client = await this.auth.getClient();
        const accessTokenResponse = await client.getAccessToken();
        if (!accessTokenResponse.token) {
            debugLogger.error('Failed to get access token from Google ADC');
            return undefined;
        }
        const tokens = {
            access_token: accessTokenResponse.token,
            token_type: 'Bearer'
        };
        return tokens;
    }
    saveTokens(_tokens) {
        // No-op, ADC manages tokens.
    }
    redirectToAuthorization(_authorizationUrl) {
        // No-op
    }
    saveCodeVerifier(_codeVerifier) {
        // No-op
    }
    codeVerifier() {
        // No-op
        return '';
    }
}
//# sourceMappingURL=google-auth-provider.js.map