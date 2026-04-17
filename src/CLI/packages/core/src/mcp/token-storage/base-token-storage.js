/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export class BaseTokenStorage {
    serviceName;
    constructor(serviceName) {
        this.serviceName = serviceName;
    }
    validateCredentials(credentials) {
        if (!credentials.serverName) {
            throw new Error('Server name is required');
        }
        if (!credentials.token) {
            throw new Error('Token is required');
        }
        if (!credentials.token.accessToken) {
            throw new Error('Access token is required');
        }
        if (!credentials.token.tokenType) {
            throw new Error('Token type is required');
        }
    }
    isTokenExpired(credentials) {
        if (!credentials.token.expiresAt) {
            return false;
        }
        const bufferMs = 5 * 60 * 1000;
        return Date.now() > credentials.token.expiresAt - bufferMs;
    }
    sanitizeServerName(serverName) {
        return serverName.replace(/[^a-zA-Z0-9-_.]/g, '_');
    }
}
//# sourceMappingURL=base-token-storage.js.map