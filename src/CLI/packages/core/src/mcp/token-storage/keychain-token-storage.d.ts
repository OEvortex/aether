/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { BaseTokenStorage } from './base-token-storage.js';
import type { OAuthCredentials } from './types.js';
interface Keytar {
    getPassword(service: string, account: string): Promise<string | null>;
    setPassword(service: string, account: string, password: string): Promise<void>;
    deletePassword(service: string, account: string): Promise<boolean>;
    findCredentials(service: string): Promise<Array<{
        account: string;
        password: string;
    }>>;
}
export declare class KeychainTokenStorage extends BaseTokenStorage {
    private keychainAvailable;
    private keytarModule;
    private keytarLoadAttempted;
    getKeytar(): Promise<Keytar | null>;
    getCredentials(serverName: string): Promise<OAuthCredentials | null>;
    setCredentials(credentials: OAuthCredentials): Promise<void>;
    deleteCredentials(serverName: string): Promise<void>;
    listServers(): Promise<string[]>;
    getAllCredentials(): Promise<Map<string, OAuthCredentials>>;
    clearAll(): Promise<void>;
    checkKeychainAvailability(): Promise<boolean>;
    isAvailable(): Promise<boolean>;
    setSecret(key: string, value: string): Promise<void>;
    getSecret(key: string): Promise<string | null>;
    deleteSecret(key: string): Promise<void>;
    listSecrets(): Promise<string[]>;
}
export {};
