/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseTokenStorage } from './base-token-storage.js';
import type { OAuthCredentials } from './types.js';
export declare class FileTokenStorage extends BaseTokenStorage {
    private readonly tokenFilePath;
    private readonly encryptionKey;
    constructor(serviceName: string);
    private deriveEncryptionKey;
    private encrypt;
    private decrypt;
    private ensureDirectoryExists;
    private loadTokens;
    private saveTokens;
    getCredentials(serverName: string): Promise<OAuthCredentials | null>;
    setCredentials(credentials: OAuthCredentials): Promise<void>;
    deleteCredentials(serverName: string): Promise<void>;
    listServers(): Promise<string[]>;
    getAllCredentials(): Promise<Map<string, OAuthCredentials>>;
    clearAll(): Promise<void>;
}
