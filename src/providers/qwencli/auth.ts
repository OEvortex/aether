/*---------------------------------------------------------------------------------------------
 *  Qwen Code CLI OAuth Authentication
 *--------------------------------------------------------------------------------------------*/

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { env, window } from 'vscode';
import { Logger } from '../../utils/logger';
import { getUserAgent } from '../../utils/userAgent';
import {
    QWEN_DEFAULT_BASE_URL,
    QWEN_OAUTH_CLIENT_ID,
    QWEN_OAUTH_DEVICE_CODE_ENDPOINT,
    QWEN_OAUTH_DEVICE_GRANT_TYPE,
    QWEN_OAUTH_SCOPE,
    QWEN_OAUTH_TOKEN_ENDPOINT,
    type QwenDeviceCodeResponse,
    type QwenOAuthCredentials,
    type QwenTokenResponse,
    TOKEN_REFRESH_BUFFER_MS
} from './types';

const ACCOUNT_STORE_VERSION = 1;
const DEFAULT_QUOTA_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const _DEVICE_CODE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const _DEVICE_POLL_INTERVAL_MS = 5000;
const MAX_POLL_FAILURES = 3;

type QwenOAuthAccount = {
    id: string;
    accountKey?: string;
    token: QwenOAuthCredentials;
    resource_url?: string;
    exhaustedUntil: number;
    lastErrorCode?: string;
    createdAt: number;
    updatedAt: number;
};

type QwenOAuthAccountStore = {
    version: number;
    activeAccountId: string | null;
    accounts: QwenOAuthAccount[];
};

type RuntimeOAuthAccount = {
    accountId: string;
    accessToken: string;
    baseURL: string;
    resourceUrl?: string;
    exhaustedUntil: number;
    healthyAccountCount: number;
    totalAccountCount: number;
};

class QwenOAuthHttpError extends Error {
    constructor(
        public readonly status: number,
        message: string
    ) {
        super(message);
        this.name = 'QwenOAuthHttpError';
    }
}

export class QwenOAuthManager {
    private static instance: QwenOAuthManager;
    private credentials: QwenOAuthCredentials | null = null;
    private refreshPromise: Promise<QwenOAuthCredentials> | null = null;
    private refreshTimer: NodeJS.Timeout | null = null;

    private constructor() {
        // Start proactive refresh timer (every 30 seconds)
        this.startProactiveRefresh();
    }

    static getInstance(): QwenOAuthManager {
        if (!QwenOAuthManager.instance) {
            QwenOAuthManager.instance = new QwenOAuthManager();
        }
        return QwenOAuthManager.instance;
    }

    private startProactiveRefresh(): void {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        this.refreshTimer = setInterval(async () => {
            try {
                // Only refresh if we have credentials and they are close to expiring
                if (this.credentials && !this.isTokenValid(this.credentials)) {
                    Logger.debug('Qwen CLI: Proactive token refresh triggered');
                    await this.refreshAccessToken(this.credentials);
                }
            } catch (error) {
                Logger.trace(`Qwen CLI: Proactive refresh failed: ${error}`);
            }
        }, 30000); // Check every 30 seconds
    }

    private getCredentialPath(): string {
        return path.join(os.homedir(), '.qwen', 'oauth_creds.json');
    }

    private getAccountsPath(): string {
        return path.join(os.homedir(), '.qwen', 'oauth_accounts.json');
    }

    private normalizeResourceUrl(resourceUrl?: unknown): string | undefined {
        if (
            typeof resourceUrl !== 'string' ||
            resourceUrl.trim().length === 0
        ) {
            return undefined;
        }
        let normalized = resourceUrl.trim();
        if (
            !normalized.startsWith('http://') &&
            !normalized.startsWith('https://')
        ) {
            normalized = `https://${normalized}`;
        }
        try {
            new URL(normalized);
            return normalized;
        } catch {
            return undefined;
        }
    }

    private parseStoredCredentials(raw: unknown): QwenOAuthCredentials | null {
        if (!raw || typeof raw !== 'object') {
            return null;
        }
        const data = raw as Record<string, unknown>;
        const accessToken =
            typeof data.access_token === 'string'
                ? data.access_token
                : undefined;
        const refreshToken =
            typeof data.refresh_token === 'string'
                ? data.refresh_token
                : undefined;
        const tokenType =
            typeof data.token_type === 'string' && data.token_type.length > 0
                ? data.token_type
                : 'Bearer';
        const expiryDateRaw =
            typeof data.expiry_date === 'number'
                ? data.expiry_date
                : typeof data.expires === 'number'
                  ? data.expires
                  : typeof data.expiry_date === 'string'
                    ? Number(data.expiry_date)
                    : undefined;
        const resourceUrl = this.normalizeResourceUrl(data.resource_url);

        if (
            !accessToken ||
            !refreshToken ||
            typeof expiryDateRaw !== 'number' ||
            !Number.isFinite(expiryDateRaw) ||
            expiryDateRaw <= 0
        ) {
            return null;
        }

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: tokenType,
            expiry_date: expiryDateRaw,
            resource_url: resourceUrl
        };
    }

    private getQuotaCooldownMs(): number {
        const raw = process.env.OPENCODE_QWEN_QUOTA_COOLDOWN_MS;
        if (typeof raw !== 'string' || raw.trim().length === 0) {
            return DEFAULT_QUOTA_COOLDOWN_MS;
        }
        const parsed = Number(raw);
        if (!Number.isFinite(parsed) || parsed < 1000) {
            return DEFAULT_QUOTA_COOLDOWN_MS;
        }
        return Math.floor(parsed);
    }

    private createAccountId(): string {
        return `acct_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 10)}`;
    }

    private deriveAccountKey(
        credentials: QwenOAuthCredentials
    ): string | undefined {
        if (credentials.refresh_token.length > 12) {
            return `refresh:${credentials.refresh_token}`;
        }
        return undefined;
    }

    private normalizeAccountStore(raw: unknown): QwenOAuthAccountStore {
        const fallback: QwenOAuthAccountStore = {
            version: ACCOUNT_STORE_VERSION,
            activeAccountId: null,
            accounts: []
        };

        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            return fallback;
        }

        const input = raw as Record<string, unknown>;
        const accountsRaw = Array.isArray(input.accounts) ? input.accounts : [];
        const accounts: QwenOAuthAccount[] = [];
        for (const item of accountsRaw) {
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
                continue;
            }
            const accountObj = item as Record<string, unknown>;
            const token = this.parseStoredCredentials(accountObj.token);
            if (!token) {
                continue;
            }
            const now = Date.now();
            const id =
                typeof accountObj.id === 'string' &&
                accountObj.id.trim().length > 0
                    ? accountObj.id.trim()
                    : this.createAccountId();
            const createdAt =
                typeof accountObj.createdAt === 'number' &&
                Number.isFinite(accountObj.createdAt)
                    ? accountObj.createdAt
                    : now;
            const updatedAt =
                typeof accountObj.updatedAt === 'number' &&
                Number.isFinite(accountObj.updatedAt)
                    ? accountObj.updatedAt
                    : createdAt;
            const exhaustedUntil =
                typeof accountObj.exhaustedUntil === 'number' &&
                Number.isFinite(accountObj.exhaustedUntil)
                    ? accountObj.exhaustedUntil
                    : 0;

            accounts.push({
                id,
                accountKey:
                    typeof accountObj.accountKey === 'string'
                        ? accountObj.accountKey
                        : this.deriveAccountKey(token),
                token,
                resource_url: token.resource_url,
                exhaustedUntil,
                lastErrorCode:
                    typeof accountObj.lastErrorCode === 'string'
                        ? accountObj.lastErrorCode
                        : undefined,
                createdAt,
                updatedAt
            });
        }

        let activeAccountId =
            typeof input.activeAccountId === 'string' &&
            input.activeAccountId.length > 0
                ? input.activeAccountId
                : null;
        if (
            activeAccountId &&
            !accounts.some((account) => account.id === activeAccountId)
        ) {
            activeAccountId = null;
        }
        if (!activeAccountId && accounts.length > 0) {
            activeAccountId = accounts[0].id;
        }

        return {
            version: ACCOUNT_STORE_VERSION,
            activeAccountId,
            accounts
        };
    }

    private loadAccountStore(): QwenOAuthAccountStore {
        const accountsPath = this.getAccountsPath();
        if (!fs.existsSync(accountsPath)) {
            const legacy = this.tryLoadLegacyCredentials();
            if (!legacy) {
                return this.normalizeAccountStore(null);
            }
            const now = Date.now();
            const accountId = this.createAccountId();
            const migratedStore: QwenOAuthAccountStore = {
                version: ACCOUNT_STORE_VERSION,
                activeAccountId: accountId,
                accounts: [
                    {
                        id: accountId,
                        accountKey: this.deriveAccountKey(legacy),
                        token: legacy,
                        resource_url: legacy.resource_url,
                        exhaustedUntil: 0,
                        createdAt: now,
                        updatedAt: now
                    }
                ]
            };
            this.saveAccountStore(migratedStore);
            return migratedStore;
        }

        try {
            const raw = JSON.parse(fs.readFileSync(accountsPath, 'utf-8'));
            return this.normalizeAccountStore(raw);
        } catch (error) {
            Logger.warn('Qwen CLI: Failed to read oauth_accounts.json', error);
            return this.normalizeAccountStore(null);
        }
    }

    private saveAccountStore(store: QwenOAuthAccountStore): void {
        const accountsPath = this.getAccountsPath();
        const dir = path.dirname(accountsPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
        }
        const tmpPath = `${accountsPath}.tmp.${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
        const payload: QwenOAuthAccountStore = {
            version: ACCOUNT_STORE_VERSION,
            activeAccountId: store.activeAccountId,
            accounts: store.accounts
        };
        try {
            fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), {
                encoding: 'utf-8',
                mode: 0o600
            });
            fs.renameSync(tmpPath, accountsPath);
        } catch (error) {
            try {
                if (fs.existsSync(tmpPath)) {
                    fs.unlinkSync(tmpPath);
                }
            } catch {}
            throw error;
        }
    }

    private tryLoadLegacyCredentials(): QwenOAuthCredentials | null {
        const keyFile = this.getCredentialPath();
        if (!fs.existsSync(keyFile)) {
            return null;
        }
        try {
            const data = JSON.parse(fs.readFileSync(keyFile, 'utf-8'));
            return this.parseStoredCredentials(data);
        } catch {
            return null;
        }
    }

    private loadCachedCredentials(): QwenOAuthCredentials {
        const keyFile = this.getCredentialPath();
        if (!fs.existsSync(keyFile)) {
            throw new Error(
                `Qwen OAuth credentials not found at ${keyFile}. Please login using the Qwen Code CLI first: qwen-code auth login`
            );
        }
        const data = JSON.parse(fs.readFileSync(keyFile, 'utf-8'));
        const parsed = this.parseStoredCredentials(data);
        if (!parsed) {
            throw new Error('Invalid Qwen OAuth credentials file');
        }
        return parsed;
    }

    private isAccountHealthy(account: QwenOAuthAccount): boolean {
        return !(account.exhaustedUntil > Date.now());
    }

    private countHealthyAccounts(store: QwenOAuthAccountStore): number {
        return store.accounts.filter((account) =>
            this.isAccountHealthy(account)
        ).length;
    }

    private pickNextHealthyAccount(
        store: QwenOAuthAccountStore,
        excluded = new Set<string>()
    ): QwenOAuthAccount | null {
        if (store.accounts.length === 0) {
            return null;
        }
        const activeIndex = store.accounts.findIndex(
            (account) => account.id === store.activeAccountId
        );
        for (let offset = 1; offset <= store.accounts.length; offset++) {
            const index =
                activeIndex >= 0
                    ? (activeIndex + offset) % store.accounts.length
                    : offset - 1;
            const candidate = store.accounts[index];
            if (!candidate || excluded.has(candidate.id)) {
                continue;
            }
            if (!this.isAccountHealthy(candidate)) {
                continue;
            }
            return candidate;
        }
        return null;
    }

    private syncCredentialFileFromAccount(account: QwenOAuthAccount): void {
        this.saveCredentials({
            access_token: account.token.access_token,
            refresh_token: account.token.refresh_token,
            token_type: account.token.token_type || 'Bearer',
            expiry_date: account.token.expiry_date,
            resource_url: account.resource_url
        });
    }

    private async refreshAccessToken(
        credentials: QwenOAuthCredentials
    ): Promise<QwenOAuthCredentials> {
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        this.refreshPromise = (async () => {
            try {
                if (!credentials.refresh_token) {
                    throw new Error(
                        'No refresh token available in credentials.'
                    );
                }

                const bodyData = new URLSearchParams();
                bodyData.set('grant_type', 'refresh_token');
                bodyData.set('refresh_token', credentials.refresh_token);
                bodyData.set('client_id', QWEN_OAUTH_CLIENT_ID);

                const response = await fetch(QWEN_OAUTH_TOKEN_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Accept: 'application/json',
                        'User-Agent': getUserAgent()
                    },
                    body: bodyData.toString()
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new QwenOAuthHttpError(
                        response.status,
                        `Token refresh failed: ${response.status} ${response.statusText}. Response: ${errorText}`
                    );
                }

                const tokenData = (await response.json()) as QwenTokenResponse;

                if (tokenData.error) {
                    throw new Error(
                        `Token refresh failed: ${tokenData.error} - ${tokenData.error_description || 'Unknown error'}`
                    );
                }

                const newCredentials: QwenOAuthCredentials = {
                    access_token: tokenData.access_token,
                    token_type: tokenData.token_type || 'Bearer',
                    refresh_token:
                        tokenData.refresh_token || credentials.refresh_token,
                    expiry_date: Date.now() + tokenData.expires_in * 1000,
                    resource_url:
                        this.normalizeResourceUrl(
                            (tokenData as any).resource_url
                        ) || credentials.resource_url
                };

                this.saveCredentials(newCredentials);
                this.credentials = newCredentials;
                return newCredentials;
            } finally {
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
    }

    private saveCredentials(credentials: QwenOAuthCredentials): void {
        const filePath = this.getCredentialPath();
        try {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
            }
            const tmpPath = `${filePath}.tmp.${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
            fs.writeFileSync(tmpPath, JSON.stringify(credentials, null, 2), {
                encoding: 'utf-8',
                mode: 0o600
            });
            fs.renameSync(tmpPath, filePath);
        } catch (error) {
            Logger.warn(`Failed to save refreshed credentials: ${error}`);
        }
    }

    private isTokenValid(credentials: QwenOAuthCredentials): boolean {
        if (!credentials.expiry_date) {
            return false;
        }
        return Date.now() < credentials.expiry_date - TOKEN_REFRESH_BUFFER_MS;
    }

    async ensureAuthenticated(forceRefresh = false): Promise<{
        accessToken: string;
        baseURL: string;
        accountId?: string;
        healthyAccountCount: number;
        totalAccountCount: number;
    }> {
        const store = this.loadAccountStore();
        if (store.accounts.length === 0) {
            const legacy = this.loadCachedCredentials();
            const now = Date.now();
            const id = this.createAccountId();
            store.accounts.push({
                id,
                accountKey: this.deriveAccountKey(legacy),
                token: legacy,
                resource_url: legacy.resource_url,
                exhaustedUntil: 0,
                createdAt: now,
                updatedAt: now
            });
            store.activeAccountId = id;
        }

        const excluded = new Set<string>();
        const maxAttempts = Math.max(1, store.accounts.length);

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            let active = store.accounts.find(
                (account) => account.id === store.activeAccountId
            );
            if (!active) {
                active = store.accounts[0];
                store.activeAccountId = active?.id || null;
            }

            if (!active) {
                throw new Error(
                    'No Qwen OAuth account found. Please login using qwen-code auth login.'
                );
            }

            if (!this.isAccountHealthy(active) || excluded.has(active.id)) {
                const nextHealthy = this.pickNextHealthyAccount(
                    store,
                    excluded
                );
                if (!nextHealthy) {
                    throw new Error(
                        'No healthy Qwen OAuth account available. Please login again or wait for cooldown.'
                    );
                }
                store.activeAccountId = nextHealthy.id;
                active = nextHealthy;
            }

            try {
                let effectiveToken = active.token;
                if (forceRefresh || !this.isTokenValid(effectiveToken)) {
                    effectiveToken = await this.refreshAccessToken(
                        active.token
                    );
                    active.token = effectiveToken;
                    active.resource_url = effectiveToken.resource_url;
                    active.updatedAt = Date.now();
                    active.exhaustedUntil = 0;
                    active.lastErrorCode = undefined;
                }

                this.credentials = effectiveToken;
                this.syncCredentialFileFromAccount(active);
                this.saveAccountStore(store);

                return {
                    accessToken: effectiveToken.access_token,
                    baseURL: this.getBaseURL(effectiveToken),
                    accountId: active.id,
                    healthyAccountCount: this.countHealthyAccounts(store),
                    totalAccountCount: store.accounts.length
                };
            } catch (error) {
                if (
                    error instanceof QwenOAuthHttpError &&
                    (error.status === 401 || error.status === 403)
                ) {
                    const now = Date.now();
                    active.exhaustedUntil = now + this.getQuotaCooldownMs();
                    active.lastErrorCode = 'auth_invalid';
                    active.updatedAt = now;
                    excluded.add(active.id);

                    const nextHealthy = this.pickNextHealthyAccount(
                        store,
                        excluded
                    );
                    if (!nextHealthy) {
                        this.saveAccountStore(store);
                        throw new Error(
                            'All Qwen OAuth accounts are invalid or exhausted. Please login again.'
                        );
                    }
                    store.activeAccountId = nextHealthy.id;
                    continue;
                }
                throw error;
            }
        }

        throw new Error('Unable to authenticate with Qwen OAuth account.');
    }

    invalidateCredentials(): void {
        // Invalidate cached credentials to force a reload on next request
        this.credentials = null;
    }

    private getBaseURL(credentials: QwenOAuthCredentials): string {
        let baseURL =
            this.normalizeResourceUrl(credentials.resource_url) ||
            QWEN_DEFAULT_BASE_URL;

        if (!baseURL.startsWith('http://') && !baseURL.startsWith('https://')) {
            baseURL = `https://${baseURL}`;
        }

        baseURL = baseURL.replace(/\/$/, '');
        if (!baseURL.endsWith('/v1')) {
            baseURL = `${baseURL}/v1`;
        }

        return baseURL;
    }

    async getAccessToken(): Promise<string> {
        const { accessToken } = await this.ensureAuthenticated();
        return accessToken;
    }

    async getBaseURLAsync(): Promise<string> {
        const { baseURL } = await this.ensureAuthenticated();
        return baseURL;
    }

    async getActiveOAuthAccount(options?: {
        allowExhausted?: boolean;
        requireHealthy?: boolean;
        preferredAccountId?: string;
    }): Promise<RuntimeOAuthAccount | null> {
        const store = this.loadAccountStore();
        if (store.accounts.length === 0) {
            return null;
        }

        if (
            typeof options?.preferredAccountId === 'string' &&
            store.accounts.some(
                (account) => account.id === options.preferredAccountId
            )
        ) {
            store.activeAccountId = options.preferredAccountId;
        }

        let account = store.accounts.find(
            (a) => a.id === store.activeAccountId
        );
        if (!account) {
            account = store.accounts[0];
            store.activeAccountId = account.id;
        }

        if (!account) {
            return null;
        }

        if (!options?.allowExhausted && !this.isAccountHealthy(account)) {
            const replacement = this.pickNextHealthyAccount(store);
            if (!replacement) {
                return null;
            }
            account = replacement;
            store.activeAccountId = replacement.id;
        }

        if (options?.requireHealthy && !this.isAccountHealthy(account)) {
            return null;
        }

        this.syncCredentialFileFromAccount(account);
        this.saveAccountStore(store);

        try {
            const authResult = await this.ensureAuthenticated(false);
            return {
                accountId: account.id,
                accessToken: authResult.accessToken,
                baseURL: authResult.baseURL,
                resourceUrl: account.resource_url,
                exhaustedUntil: account.exhaustedUntil,
                healthyAccountCount: authResult.healthyAccountCount,
                totalAccountCount: authResult.totalAccountCount
            };
        } catch (error) {
            Logger.warn(
                'Qwen CLI: Failed to authenticate selected OAuth account',
                error
            );
            return null;
        }
    }

    async markOAuthAccountQuotaExhausted(
        accountId: string,
        errorCode = 'insufficient_quota'
    ): Promise<{
        accountId: string;
        exhaustedUntil: number;
        healthyAccountCount: number;
        totalAccountCount: number;
    } | null> {
        if (typeof accountId !== 'string' || accountId.length === 0) {
            return null;
        }

        const store = this.loadAccountStore();
        const target = store.accounts.find(
            (account) => account.id === accountId
        );
        if (!target) {
            return null;
        }

        const now = Date.now();
        target.exhaustedUntil = now + this.getQuotaCooldownMs();
        target.lastErrorCode = errorCode;
        target.updatedAt = now;

        if (store.activeAccountId === target.id) {
            const next = this.pickNextHealthyAccount(
                store,
                new Set([target.id])
            );
            if (next) {
                store.activeAccountId = next.id;
            }
        }

        this.saveAccountStore(store);

        return {
            accountId: target.id,
            exhaustedUntil: target.exhaustedUntil,
            healthyAccountCount: this.countHealthyAccounts(store),
            totalAccountCount: store.accounts.length
        };
    }

    async switchToNextHealthyOAuthAccount(
        excludedAccountIds: string[] = []
    ): Promise<RuntimeOAuthAccount | null> {
        const store = this.loadAccountStore();
        const excluded = new Set(
            excludedAccountIds.filter(
                (id) => typeof id === 'string' && id.length > 0
            )
        );
        const next = this.pickNextHealthyAccount(store, excluded);
        if (!next) {
            return null;
        }

        store.activeAccountId = next.id;
        next.updatedAt = Date.now();
        this.saveAccountStore(store);

        return this.getActiveOAuthAccount({
            allowExhausted: false,
            requireHealthy: true,
            preferredAccountId: next.id
        });
    }

    // ============= OAuth Device Flow (PKCE) Methods =============

    /**
     * Generate PKCE code verifier and challenge
     */
    private async createPKCE(): Promise<{
        verifier: string;
        challenge: string;
        method: string;
    }> {
        const verifier = crypto.randomBytes(32).toString('base64url');
        const challenge = crypto
            .createHash('sha256')
            .update(verifier)
            .digest('base64url');
        return {
            verifier,
            challenge,
            method: 'S256'
        };
    }

    /**
     * Request device code from OAuth server
     */
    private async requestDeviceCode(pkce: {
        verifier: string;
        challenge: string;
        method: string;
    }): Promise<QwenDeviceCodeResponse | null> {
        try {
            const params = new URLSearchParams();
            params.set('client_id', QWEN_OAUTH_CLIENT_ID);
            params.set('scope', QWEN_OAUTH_SCOPE);
            params.set('code_challenge', pkce.challenge);
            params.set('code_challenge_method', pkce.method);
            params.set('redirect_uri', 'http://localhost:7890/callback');
            params.set('state', crypto.randomBytes(16).toString('hex'));
            params.set('verification_uri', 'https://qwen.io/auth/device');
            params.set(
                'verification_uri_complete',
                'https://qwen.io/auth/device'
            );
            // Add the client param
            params.set('client', 'qwen-code');

            const response = await fetch(QWEN_OAUTH_DEVICE_CODE_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json',
                    'User-Agent': getUserAgent()
                },
                body: params.toString()
            });

            if (!response.ok) {
                const errorText = await response.text();
                Logger.warn(
                    `[qwencli] Device code request failed: ${response.status} - ${errorText}`
                );
                return null;
            }

            const data = (await response.json()) as QwenDeviceCodeResponse;
            Logger.debug('[qwencli] Device code received', {
                user_code: data.user_code
            });
            return data;
        } catch (error) {
            Logger.warn('[qwencli] Device code request error', error);
            return null;
        }
    }

    /**
     * Poll for token after device code authorization
     */
    private async pollForToken(
        deviceCode: string,
        pkceVerifier: string
    ): Promise<{
        type:
            | 'success'
            | 'pending'
            | 'slow_down'
            | 'failed'
            | 'denied'
            | 'expired';
        access?: string;
        refresh?: string;
        expires?: number;
        resourceUrl?: string;
        error?: string;
        description?: string;
        fatal?: boolean;
        status?: number;
    }> {
        try {
            const params = new URLSearchParams();
            params.set('grant_type', QWEN_OAUTH_DEVICE_GRANT_TYPE);
            params.set('device_code', deviceCode);
            params.set('client_id', QWEN_OAUTH_CLIENT_ID);
            params.set('code_verifier', pkceVerifier);
            params.set('verification_uri', 'https://qwen.io/auth/device');

            const response = await fetch(QWEN_OAUTH_TOKEN_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json',
                    'User-Agent': getUserAgent()
                },
                body: params.toString()
            });

            const data = (await response.json()) as QwenTokenResponse & {
                error?: string;
                error_description?: string;
            };

            // Handle OAuth errors
            if (data.error) {
                const errorCode = data.error.toLowerCase();
                switch (errorCode) {
                    case 'authorization_pending':
                        return { type: 'pending' };
                    case 'slow_down':
                        return { type: 'slow_down' };
                    case 'access_denied':
                        return {
                            type: 'denied',
                            error: errorCode,
                            description: data.error_description,
                            fatal: true
                        };
                    case 'expired_token':
                        return {
                            type: 'expired',
                            error: errorCode,
                            description: data.error_description,
                            fatal: true
                        };
                    default:
                        return {
                            type: 'failed',
                            error: errorCode,
                            description: data.error_description,
                            fatal: true,
                            status: response.status
                        };
                }
            }

            if (!response.ok) {
                return {
                    type: 'failed',
                    error: 'http_error',
                    description: `HTTP ${response.status}`,
                    status: response.status
                };
            }

            return {
                type: 'success',
                access: data.access_token,
                refresh: data.refresh_token,
                expires: Date.now() + data.expires_in * 1000,
                resourceUrl: data.resource_url
            };
        } catch (error) {
            Logger.warn('[qwencli] Token polling error', error);
            return {
                type: 'failed',
                error: 'network_error',
                description:
                    error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Start OAuth device flow and guide user through login
     * @returns OAuth credentials if successful, null if failed/cancelled
     */
    async startOAuthFlow(): Promise<QwenOAuthCredentials | null> {
        try {
            // Show informational message
            await window.showInformationMessage(
                'Starting Qwen OAuth login... A browser window will open for authentication.',
                'OK'
            );

            // Generate PKCE
            const pkce = await this.createPKCE();

            // Request device code
            const deviceAuth = await this.requestDeviceCode(pkce);
            if (!deviceAuth) {
                void window.showErrorMessage(
                    'Failed to request device code. Please try again.'
                );
                return null;
            }

            // Show user code and verification URL
            const message = `Please visit: ${deviceAuth.verification_uri}\n\nEnter code: ${deviceAuth.user_code}\n\nThen click Continue in the browser.`;
            void window.showInformationMessage(
                message,
                'Open Browser',
                'Copy Code'
            );

            // Open verification URL in browser
            const verificationUrl =
                deviceAuth.verification_uri_complete ||
                deviceAuth.verification_uri;
            Logger.info('[qwencli] Verification URL', { url: verificationUrl });

            try {
                await env.openExternal(vscode.Uri.parse(verificationUrl));
            } catch (openError) {
                Logger.warn(
                    '[qwencli] Failed to open browser automatically',
                    openError
                );
                // User will need to manually open the URL
            }

            // Poll for token
            const pollStart = Date.now();
            const expiresIn = deviceAuth.expires_in * 1000;
            let pollInterval = (deviceAuth.interval || 5) * 1000;
            const maxInterval = 30 * 1000; // Cap at 30 seconds
            let consecutiveFailures = 0;

            while (Date.now() - pollStart < expiresIn) {
                // Wait before polling
                await new Promise((resolve) =>
                    setTimeout(resolve, pollInterval)
                );

                const result = await this.pollForToken(
                    deviceAuth.device_code,
                    pkce.verifier
                );

                if (result.type === 'success' && result.access) {
                    const credentials: QwenOAuthCredentials = {
                        access_token: result.access,
                        refresh_token: result.refresh || '',
                        token_type: 'Bearer',
                        expiry_date: result.expires || Date.now() + 3600 * 1000,
                        resource_url: result.resourceUrl
                    };

                    void window.showInformationMessage(
                        'Qwen OAuth login successful!'
                    );
                    Logger.info('[qwencli] OAuth flow completed successfully');
                    return credentials;
                }

                if (result.type === 'slow_down') {
                    consecutiveFailures = 0;
                    pollInterval = Math.min(pollInterval + 5000, maxInterval);
                    continue;
                }

                if (result.type === 'pending') {
                    consecutiveFailures = 0;
                    continue;
                }

                if (result.type === 'failed') {
                    if (result.fatal) {
                        Logger.error(
                            '[qwencli] OAuth token polling failed with fatal error',
                            {
                                status: result.status,
                                error: result.error,
                                description: result.description
                            }
                        );
                        void window.showErrorMessage(
                            `OAuth failed: ${result.description || result.error}`
                        );
                        return null;
                    }

                    consecutiveFailures++;
                    Logger.warn(
                        `[qwencli] OAuth token polling failed (${consecutiveFailures}/${MAX_POLL_FAILURES})`
                    );

                    if (consecutiveFailures >= MAX_POLL_FAILURES) {
                        void window.showErrorMessage(
                            'OAuth login timed out. Please try again.'
                        );
                        return null;
                    }
                    continue;
                }

                if (result.type === 'denied') {
                    void window.showErrorMessage(
                        'Authorization was denied. Please try again.'
                    );
                    return null;
                }

                if (result.type === 'expired') {
                    void window.showErrorMessage(
                        'Authorization code expired. Please try again.'
                    );
                    return null;
                }
            }

            void window.showErrorMessage(
                'OAuth login timed out. Please try again.'
            );
            return null;
        } catch (error) {
            Logger.error('[qwencli] OAuth flow error', error);
            void window.showErrorMessage(
                `OAuth login failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
            return null;
        }
    }

    /**
     * Add a new OAuth account (for multi-account support)
     */
    async addOAuthAccount(credentials: QwenOAuthCredentials): Promise<{
        accountId: string;
        healthyAccountCount: number;
        totalAccountCount: number;
    } | null> {
        const store = this.loadAccountStore();
        const now = Date.now();
        const newId = this.createAccountId();

        store.accounts.push({
            id: newId,
            accountKey: this.deriveAccountKey(credentials),
            token: credentials,
            resource_url: credentials.resource_url,
            exhaustedUntil: 0,
            createdAt: now,
            updatedAt: now
        });

        // Set new account as active
        store.activeAccountId = newId;
        this.saveAccountStore(store);

        // Save credentials to file
        this.saveCredentials(credentials);
        this.credentials = credentials;

        return {
            accountId: newId,
            healthyAccountCount: this.countHealthyAccounts(store),
            totalAccountCount: store.accounts.length
        };
    }
}
