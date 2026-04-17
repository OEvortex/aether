/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as crypto from 'node:crypto';
import { createDebugLogger } from '../../utils/debugLogger.js';
import { BaseTokenStorage } from './base-token-storage.js';
const debugLogger = createDebugLogger('MCP_KEYCHAIN');
const KEYCHAIN_TEST_PREFIX = '__keychain_test__';
const SECRET_PREFIX = '__secret__';
export class KeychainTokenStorage extends BaseTokenStorage {
    keychainAvailable = null;
    keytarModule = null;
    keytarLoadAttempted = false;
    async getKeytar() {
        // If we've already tried loading (successfully or not), return the result
        if (this.keytarLoadAttempted) {
            return this.keytarModule;
        }
        this.keytarLoadAttempted = true;
        try {
            // Try to import keytar without any timeout - let the OS handle it
            const moduleName = 'keytar';
            const module = await import(moduleName);
            this.keytarModule = module.default || module;
        }
        catch (error) {
            debugLogger.error(`Failed to load keytar module: ${error}`);
        }
        return this.keytarModule;
    }
    async getCredentials(serverName) {
        if (!(await this.checkKeychainAvailability())) {
            throw new Error('Keychain is not available');
        }
        const keytar = await this.getKeytar();
        if (!keytar) {
            throw new Error('Keytar module not available');
        }
        try {
            const sanitizedName = this.sanitizeServerName(serverName);
            const data = await keytar.getPassword(this.serviceName, sanitizedName);
            if (!data) {
                return null;
            }
            const credentials = JSON.parse(data);
            if (this.isTokenExpired(credentials)) {
                return null;
            }
            return credentials;
        }
        catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error(`Failed to parse stored credentials for ${serverName}`);
            }
            throw error;
        }
    }
    async setCredentials(credentials) {
        if (!(await this.checkKeychainAvailability())) {
            throw new Error('Keychain is not available');
        }
        const keytar = await this.getKeytar();
        if (!keytar) {
            throw new Error('Keytar module not available');
        }
        this.validateCredentials(credentials);
        const sanitizedName = this.sanitizeServerName(credentials.serverName);
        const updatedCredentials = {
            ...credentials,
            updatedAt: Date.now()
        };
        const data = JSON.stringify(updatedCredentials);
        await keytar.setPassword(this.serviceName, sanitizedName, data);
    }
    async deleteCredentials(serverName) {
        if (!(await this.checkKeychainAvailability())) {
            throw new Error('Keychain is not available');
        }
        const keytar = await this.getKeytar();
        if (!keytar) {
            throw new Error('Keytar module not available');
        }
        const sanitizedName = this.sanitizeServerName(serverName);
        const deleted = await keytar.deletePassword(this.serviceName, sanitizedName);
        if (!deleted) {
            throw new Error(`No credentials found for ${serverName}`);
        }
    }
    async listServers() {
        if (!(await this.checkKeychainAvailability())) {
            throw new Error('Keychain is not available');
        }
        const keytar = await this.getKeytar();
        if (!keytar) {
            throw new Error('Keytar module not available');
        }
        try {
            const credentials = await keytar.findCredentials(this.serviceName);
            return credentials
                .filter((cred) => !cred.account.startsWith(KEYCHAIN_TEST_PREFIX))
                .filter((cred) => !cred.account.startsWith(SECRET_PREFIX))
                .map((cred) => cred.account);
        }
        catch (error) {
            debugLogger.error(`Failed to list servers from keychain: ${error}`);
            return [];
        }
    }
    async getAllCredentials() {
        if (!(await this.checkKeychainAvailability())) {
            throw new Error('Keychain is not available');
        }
        const keytar = await this.getKeytar();
        if (!keytar) {
            throw new Error('Keytar module not available');
        }
        const result = new Map();
        try {
            const credentials = (await keytar.findCredentials(this.serviceName))
                .filter((c) => !c.account.startsWith(KEYCHAIN_TEST_PREFIX))
                .filter((c) => !c.account.startsWith(SECRET_PREFIX));
            for (const cred of credentials) {
                try {
                    const data = JSON.parse(cred.password);
                    if (!this.isTokenExpired(data)) {
                        result.set(cred.account, data);
                    }
                }
                catch (error) {
                    debugLogger.error(`Failed to parse credentials for ${cred.account}: ${error}`);
                }
            }
        }
        catch (error) {
            debugLogger.error(`Failed to get all credentials from keychain: ${error}`);
        }
        return result;
    }
    async clearAll() {
        if (!(await this.checkKeychainAvailability())) {
            throw new Error('Keychain is not available');
        }
        const servers = this.keytarModule
            ? await this.keytarModule
                .findCredentials(this.serviceName)
                .then((creds) => creds.map((c) => c.account))
                .catch((error) => {
                throw new Error(`Failed to list servers for clearing: ${error.message}`);
            })
            : [];
        const errors = [];
        for (const server of servers) {
            try {
                await this.deleteCredentials(server);
            }
            catch (error) {
                errors.push(error);
            }
        }
        if (errors.length > 0) {
            throw new Error(`Failed to clear some credentials: ${errors.map((e) => e.message).join(', ')}`);
        }
    }
    // Checks whether or not a set-get-delete cycle with the keychain works.
    // Returns false if any operation fails.
    async checkKeychainAvailability() {
        if (this.keychainAvailable !== null) {
            return this.keychainAvailable;
        }
        try {
            const keytar = await this.getKeytar();
            if (!keytar) {
                this.keychainAvailable = false;
                return false;
            }
            const testAccount = `${KEYCHAIN_TEST_PREFIX}${crypto.randomBytes(8).toString('hex')}`;
            const testPassword = 'test';
            await keytar.setPassword(this.serviceName, testAccount, testPassword);
            const retrieved = await keytar.getPassword(this.serviceName, testAccount);
            const deleted = await keytar.deletePassword(this.serviceName, testAccount);
            const success = deleted && retrieved === testPassword;
            this.keychainAvailable = success;
            return success;
        }
        catch (_error) {
            this.keychainAvailable = false;
            return false;
        }
    }
    async isAvailable() {
        return this.checkKeychainAvailability();
    }
    async setSecret(key, value) {
        if (!(await this.checkKeychainAvailability())) {
            throw new Error('Keychain is not available');
        }
        const keytar = await this.getKeytar();
        if (!keytar) {
            throw new Error('Keytar module not available');
        }
        await keytar.setPassword(this.serviceName, `${SECRET_PREFIX}${key}`, value);
    }
    async getSecret(key) {
        if (!(await this.checkKeychainAvailability())) {
            throw new Error('Keychain is not available');
        }
        const keytar = await this.getKeytar();
        if (!keytar) {
            throw new Error('Keytar module not available');
        }
        return keytar.getPassword(this.serviceName, `${SECRET_PREFIX}${key}`);
    }
    async deleteSecret(key) {
        if (!(await this.checkKeychainAvailability())) {
            throw new Error('Keychain is not available');
        }
        const keytar = await this.getKeytar();
        if (!keytar) {
            throw new Error('Keytar module not available');
        }
        const deleted = await keytar.deletePassword(this.serviceName, `${SECRET_PREFIX}${key}`);
        if (!deleted) {
            throw new Error(`No secret found for key: ${key}`);
        }
    }
    async listSecrets() {
        if (!(await this.checkKeychainAvailability())) {
            throw new Error('Keychain is not available');
        }
        const keytar = await this.getKeytar();
        if (!keytar) {
            throw new Error('Keytar module not available');
        }
        try {
            const credentials = await keytar.findCredentials(this.serviceName);
            return credentials
                .filter((cred) => cred.account.startsWith(SECRET_PREFIX))
                .map((cred) => cred.account.substring(SECRET_PREFIX.length));
        }
        catch (error) {
            debugLogger.error(`Failed to list secrets from keychain: ${error}`);
            return [];
        }
    }
}
//# sourceMappingURL=keychain-token-storage.js.map