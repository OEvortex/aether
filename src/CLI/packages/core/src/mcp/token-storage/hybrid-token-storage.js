/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseTokenStorage } from './base-token-storage.js';
import { FileTokenStorage } from './file-token-storage.js';
import { TokenStorageType } from './types.js';
const FORCE_FILE_STORAGE_ENV_VAR = 'aether_cli_FORCE_FILE_STORAGE';
export class HybridTokenStorage extends BaseTokenStorage {
    storage = null;
    storageType = null;
    storageInitPromise = null;
    async initializeStorage() {
        const forceFileStorage = process.env[FORCE_FILE_STORAGE_ENV_VAR] === 'true';
        if (!forceFileStorage) {
            try {
                const { KeychainTokenStorage } = await import('./keychain-token-storage.js');
                const keychainStorage = new KeychainTokenStorage(this.serviceName);
                const isAvailable = await keychainStorage.isAvailable();
                if (isAvailable) {
                    this.storage = keychainStorage;
                    this.storageType = TokenStorageType.KEYCHAIN;
                    return this.storage;
                }
            }
            catch (_e) {
                // Fallback to file storage if keychain fails to initialize
            }
        }
        this.storage = new FileTokenStorage(this.serviceName);
        this.storageType = TokenStorageType.ENCRYPTED_FILE;
        return this.storage;
    }
    async getStorage() {
        if (this.storage !== null) {
            return this.storage;
        }
        // Use a single initialization promise to avoid race conditions
        if (!this.storageInitPromise) {
            this.storageInitPromise = this.initializeStorage();
        }
        // Wait for initialization to complete
        return await this.storageInitPromise;
    }
    async getCredentials(serverName) {
        const storage = await this.getStorage();
        return storage.getCredentials(serverName);
    }
    async setCredentials(credentials) {
        const storage = await this.getStorage();
        await storage.setCredentials(credentials);
    }
    async deleteCredentials(serverName) {
        const storage = await this.getStorage();
        await storage.deleteCredentials(serverName);
    }
    async listServers() {
        const storage = await this.getStorage();
        return storage.listServers();
    }
    async getAllCredentials() {
        const storage = await this.getStorage();
        return storage.getAllCredentials();
    }
    async clearAll() {
        const storage = await this.getStorage();
        await storage.clearAll();
    }
    async getStorageType() {
        await this.getStorage();
        return this.storageType;
    }
}
//# sourceMappingURL=hybrid-token-storage.js.map