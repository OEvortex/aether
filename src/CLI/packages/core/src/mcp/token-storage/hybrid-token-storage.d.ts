/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseTokenStorage } from './base-token-storage.js';
import type { OAuthCredentials } from './types.js';
import { TokenStorageType } from './types.js';
export declare class HybridTokenStorage extends BaseTokenStorage {
    private storage;
    private storageType;
    private storageInitPromise;
    private initializeStorage;
    private getStorage;
    getCredentials(serverName: string): Promise<OAuthCredentials | null>;
    setCredentials(credentials: OAuthCredentials): Promise<void>;
    deleteCredentials(serverName: string): Promise<void>;
    listServers(): Promise<string[]>;
    getAllCredentials(): Promise<Map<string, OAuthCredentials>>;
    clearAll(): Promise<void>;
    getStorageType(): Promise<TokenStorageType>;
}
