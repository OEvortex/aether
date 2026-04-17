/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { OAuthCredentials, TokenStorage } from './types.js';
export declare abstract class BaseTokenStorage implements TokenStorage {
    protected readonly serviceName: string;
    constructor(serviceName: string);
    abstract getCredentials(serverName: string): Promise<OAuthCredentials | null>;
    abstract setCredentials(credentials: OAuthCredentials): Promise<void>;
    abstract deleteCredentials(serverName: string): Promise<void>;
    abstract listServers(): Promise<string[]>;
    abstract getAllCredentials(): Promise<Map<string, OAuthCredentials>>;
    abstract clearAll(): Promise<void>;
    protected validateCredentials(credentials: OAuthCredentials): void;
    protected isTokenExpired(credentials: OAuthCredentials): boolean;
    protected sanitizeServerName(serverName: string): string;
}
