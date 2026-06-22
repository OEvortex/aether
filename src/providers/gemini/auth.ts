/*---------------------------------------------------------------------------------------------
 *  Gemini OAuth Authentication - Authorization Code Flow with PKCE
 *--------------------------------------------------------------------------------------------*/

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { env, window } from 'vscode';
import { Logger } from '../../utils/logger.js';
import { getUserAgent } from '../../utils/userAgent.js';
import {
    GEMINI_CLIENT_ID,
    GEMINI_CLIENT_SECRET,
    GEMINI_OAUTH_SCOPE,
    GEMINI_OAUTH_TOKEN_ENDPOINT,
    GEMINI_REDIRECT_URI,
    type GeminiOAuthCredentials,
    type GeminiTokenResponse,
    TOKEN_REFRESH_BUFFER_MS
} from './types';

const _DEFAULT_QUOTA_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const PKCE_CHALLENGE_METHOD = 'S256';
const GEMINI_DIR = path.join(os.homedir(), '.gemini');
const OAUTH_CREDS_FILE = path.join(GEMINI_DIR, 'oauth_creds.json');

// Retry configuration for token refresh
const DEFAULT_MAX_ATTEMPTS = 5;
const RETRY_BASE_DELAY_MS = 1000;

export class GeminiOAuthManager {
    private static instance: GeminiOAuthManager;
    private credentials: GeminiOAuthCredentials | null = null;
    private refreshPromise: Promise<GeminiOAuthCredentials> | null = null;
    private refreshTimer: NodeJS.Timeout | null = null;

    private constructor() {
        this.credentials = this.loadCredentials();
        this.startProactiveRefresh();
    }

    static getInstance(): GeminiOAuthManager {
        if (!GeminiOAuthManager.instance) {
            GeminiOAuthManager.instance = new GeminiOAuthManager();
        }
        return GeminiOAuthManager.instance;
    }

    private loadCredentials(): GeminiOAuthCredentials | null {
        // First try to load from Gemini CLI storage
        try {
            if (fs.existsSync(OAUTH_CREDS_FILE)) {
                const data = JSON.parse(
                    fs.readFileSync(OAUTH_CREDS_FILE, 'utf-8')
                );
                Logger.debug(
                    `[gemini] Loaded raw credentials from CLI storage`,
                    {
                        hasAccessToken: !!data.access_token,
                        hasRefreshToken: !!data.refresh_token,
                        hasExpiry: !!data.expiry_date,
                        expiryDate: data.expiry_date,
                        currentTime: Date.now()
                    }
                );

                // Handle both formats: with expiry_date (number) or expires_at (ISO string)
                let expiry_date: number | undefined;
                if (data.expiry_date) {
                    expiry_date = data.expiry_date;
                } else if (data.expires_at) {
                    expiry_date = new Date(data.expires_at).getTime();
                }

                if (data.access_token && expiry_date) {
                    const creds = {
                        access_token: data.access_token,
                        token_type: data.token_type || 'Bearer',
                        refresh_token: data.refresh_token,
                        expiry_date: expiry_date,
                        resource_url:
                            data.resource_url ||
                            'https://generativelanguage.googleapis.com'
                    };
                    Logger.debug(`[gemini] Parsed credentials`, {
                        accessToken: `${creds.access_token.substring(0, 20)}...`,
                        expiryDate: creds.expiry_date,
                        isValid: this.isTokenValid(creds)
                    });
                    return creds;
                }
            }
        } catch (error) {
            Logger.trace(`[gemini] Failed to load from CLI storage: ${error}`);
        }
        return null;
    }

    /**
     * Helper to wait for a specified delay (used for retry backoff)
     */
    private async waitMs(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Check if an error is retryable (network issues, 5xx errors)
     */
    private isRetryableError(status: number | undefined): boolean {
        return !status || status >= 500 || status === 429;
    }

    private startProactiveRefresh(): void {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        this.refreshTimer = setInterval(async () => {
            try {
                if (this.credentials && !this.isTokenValid(this.credentials)) {
                    Logger.debug('[gemini] Proactive token refresh triggered');
                    try {
                        const refreshed = await this.refreshAccessToken(
                            this.credentials
                        );
                        this.credentials = refreshed;
                        this.saveCredentials(refreshed);
                    } catch (_error) {
                        Logger.warn(
                            '[gemini] Proactive refresh failed, stopping timer'
                        );
                        this.invalidateCredentials();
                        if (this.refreshTimer) {
                            clearInterval(this.refreshTimer);
                            this.refreshTimer = null;
                        }
                    }
                }
            } catch (error) {
                Logger.trace(`[gemini] Proactive refresh failed: ${error}`);
            }
        }, 30000);
    }

    private isTokenValid(credentials: GeminiOAuthCredentials): boolean {
        if (!credentials.expiry_date) {
            return false;
        }
        return Date.now() < credentials.expiry_date - TOKEN_REFRESH_BUFFER_MS;
    }

    async getValidCredentials(): Promise<GeminiOAuthCredentials | null> {
        Logger.debug('[gemini] getValidCredentials called');

        // Try loading from CLI storage first (in case it was updated externally)
        const cliCreds = this.loadCredentials();
        if (cliCreds) {
            this.credentials = cliCreds;
        }

        if (!this.credentials) {
            Logger.warn('[gemini] No credentials found');
            return null;
        }

        Logger.debug('[gemini] Checking token validity', {
            expiryDate: this.credentials.expiry_date,
            currentTime: Date.now(),
            isValid: this.isTokenValid(this.credentials)
        });

        if (this.isTokenValid(this.credentials)) {
            Logger.debug('[gemini] Token is valid');
            return this.credentials;
        }

        if (this.refreshPromise) {
            Logger.debug('[gemini] Refresh already in progress');
            return this.refreshPromise;
        }

        // Try to refresh expired token
        if (this.credentials.refresh_token) {
            Logger.debug('[gemini] Attempting token refresh');
            try {
                const refreshed = await this.refreshAccessToken(
                    this.credentials
                );
                this.saveCredentials(refreshed);
                Logger.debug('[gemini] Token refresh successful');
                return refreshed;
            } catch (error) {
                Logger.warn(
                    '[gemini] Token refresh failed, invalidating credentials',
                    error
                );
                // Invalidate the bad credentials
                this.invalidateCredentials();
                return null;
            }
        }

        Logger.warn('[gemini] No refresh token available');
        return null;
    }

    async startOAuthFlow(): Promise<GeminiOAuthCredentials | null> {
        try {
            // Generate PKCE
            const pkce = await this.generatePKCE();

            // Build authorization URL
            const authUrl = new URL(
                'https://accounts.google.com/o/oauth2/v2/auth'
            );
            authUrl.searchParams.set('client_id', GEMINI_CLIENT_ID);
            authUrl.searchParams.set('response_type', 'code');
            authUrl.searchParams.set('redirect_uri', GEMINI_REDIRECT_URI);
            authUrl.searchParams.set('scope', GEMINI_OAUTH_SCOPE.join(' '));
            authUrl.searchParams.set('code_challenge', pkce.challenge);
            authUrl.searchParams.set(
                'code_challenge_method',
                PKCE_CHALLENGE_METHOD
            );
            authUrl.searchParams.set('access_type', 'offline');
            authUrl.searchParams.set('prompt', 'consent');
            authUrl.hash = 'opencode'; // Fragment for terminal glyph filtering

            // Show URL to user
            await window.showInformationMessage(
                'Opening browser for Gemini OAuth login...',
                'Open Browser'
            );

            // Open browser
            await env.openExternal(vscode.Uri.parse(authUrl.toString()));

            // Wait for callback on local server
            const code = await this.waitForCallback();

            if (!code) {
                throw new Error('OAuth callback not received');
            }

            // Exchange code for tokens
            const result = await this.exchangeCode(code, pkce.verifier);

            if (!result) {
                throw new Error('Token exchange failed');
            }

            this.credentials = result;
            this.saveCredentials(result);
            return result;
        } catch (error) {
            Logger.error('[gemini] OAuth flow failed', error);
            return null;
        }
    }

    private async generatePKCE(): Promise<{
        challenge: string;
        verifier: string;
    }> {
        const verifier = crypto.randomBytes(32).toString('base64url');
        const hash = crypto
            .createHash('sha256')
            .update(verifier)
            .digest('base64url');
        return { challenge: hash, verifier };
    }

    private async waitForCallback(): Promise<string | null> {
        return new Promise((resolve) => {
            // Simple HTTP server for callback
            const http = require('node:http');
            const server = http.createServer((req: any, res: any) => {
                const url = req.url;
                if (url?.includes('/oauth2callback')) {
                    const code = new URL(
                        url,
                        'http://localhost'
                    ).searchParams.get('code');
                    res.end(
                        'Authentication successful! You can close this window.'
                    );
                    server.close();
                    resolve(code);
                } else {
                    res.end('Invalid request');
                    server.close();
                    resolve(null);
                }
            });

            server.listen(8085, () => {
                Logger.debug(
                    '[gemini] OAuth callback server started on port 8085'
                );
            });
        });
    }

    private async exchangeCode(
        code: string,
        verifier: string
    ): Promise<GeminiOAuthCredentials | null> {
        const maxAttempts = DEFAULT_MAX_ATTEMPTS;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const body = new URLSearchParams();
                body.set('client_id', GEMINI_CLIENT_ID);
                body.set('code', code);
                body.set('grant_type', 'authorization_code');
                body.set('redirect_uri', GEMINI_REDIRECT_URI);
                body.set('code_verifier', verifier);

                const response = await fetch(GEMINI_OAUTH_TOKEN_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Accept: 'application/json',
                        'User-Agent': getUserAgent()
                    },
                    body: body.toString()
                });

                if (!response.ok) {
                    const errorText = await response.text();

                    // Handle invalid_grant error - Google revoked the refresh token
                    if (errorText.includes('invalid_grant')) {
                        Logger.warn(
                            '[gemini] Google revoked the stored refresh token. Run "Gemini: Sign In" to re-authenticate.'
                        );
                        this.invalidateCredentials();
                    }

                    // Retry on retryable errors
                    if (
                        attempt < maxAttempts &&
                        this.isRetryableError(response.status)
                    ) {
                        const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
                        Logger.debug(
                            `[gemini] Token exchange attempt ${attempt} failed, retrying in ${delay}ms...`
                        );
                        await this.waitMs(delay);
                        continue;
                    }

                    throw new Error(
                        `Token exchange failed: ${response.status} ${errorText}`
                    );
                }

                const tokenData =
                    (await response.json()) as GeminiTokenResponse;

                const credentials: GeminiOAuthCredentials = {
                    access_token: tokenData.access_token,
                    token_type: tokenData.token_type || 'Bearer',
                    refresh_token: tokenData.refresh_token,
                    expiry_date: Date.now() + tokenData.expires_in * 1000,
                    resource_url: 'https://generativelanguage.googleapis.com'
                };

                return credentials;
            } catch (error) {
                Logger.error('[gemini] Token exchange failed', error);

                // Retry on network errors
                if (attempt < maxAttempts) {
                    const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
                    Logger.debug(
                        `[gemini] Token exchange attempt ${attempt} failed, retrying in ${delay}ms...`
                    );
                    await this.waitMs(delay);
                    continue;
                }

                return null;
            }
        }

        return null;
    }

    private async refreshAccessToken(
        credentials: GeminiOAuthCredentials
    ): Promise<GeminiOAuthCredentials> {
        if (!credentials.refresh_token) {
            throw new Error('No refresh token available');
        }

        const body = new URLSearchParams();
        body.set('client_id', GEMINI_CLIENT_ID);
        body.set('client_secret', GEMINI_CLIENT_SECRET);
        body.set('refresh_token', credentials.refresh_token);
        body.set('grant_type', 'refresh_token');
        body.set('scope', GEMINI_OAUTH_SCOPE.join(' '));

        const response = await fetch(GEMINI_OAUTH_TOKEN_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
                'User-Agent': getUserAgent()
            },
            body: body.toString()
        });

        if (!response.ok) {
            const errorText = await response.text();
            Logger.warn(
                `[gemini] Token refresh failed: ${response.status} ${errorText}`
            );

            // Handle invalid_grant error - Google revoked the refresh token
            // Clear stored credentials and prompt user to re-authenticate
            if (errorText.includes('invalid_grant')) {
                Logger.warn(
                    '[gemini] Google revoked the stored refresh token. Run "Gemini: Sign In" to re-authenticate.'
                );
                this.invalidateCredentials();
            }

            throw new Error(
                `Token refresh failed: ${response.status} ${errorText}`
            );
        }

        const tokenData = (await response.json()) as GeminiTokenResponse;

        const newCredentials: GeminiOAuthCredentials = {
            access_token: tokenData.access_token,
            token_type: tokenData.token_type || 'Bearer',
            refresh_token: tokenData.refresh_token || credentials.refresh_token,
            expiry_date: Date.now() + tokenData.expires_in * 1000,
            resource_url: credentials.resource_url
        };

        this.credentials = newCredentials;
        this.saveCredentials(newCredentials);
        return newCredentials;
    }

    private saveCredentials(credentials: GeminiOAuthCredentials): void {
        this.credentials = credentials;
        // Also save to Gemini CLI storage for interoperability
        try {
            const data = {
                access_token: credentials.access_token,
                token_type: credentials.token_type,
                refresh_token: credentials.refresh_token,
                expiry_date: credentials.expiry_date,
                resource_url: credentials.resource_url
            };
            fs.mkdirSync(GEMINI_DIR, { recursive: true });
            fs.writeFileSync(OAUTH_CREDS_FILE, JSON.stringify(data, null, 2));
            Logger.debug('[gemini] Saved credentials to Gemini CLI storage');
        } catch (error) {
            Logger.trace(`[gemini] Failed to save to CLI storage: ${error}`);
        }
    }

    invalidateCredentials(): void {
        this.credentials = null;
        // Clear CLI storage
        try {
            if (fs.existsSync(OAUTH_CREDS_FILE)) {
                fs.unlinkSync(OAUTH_CREDS_FILE);
            }
        } catch (error) {
            Logger.trace(`[gemini] Failed to clear CLI storage: ${error}`);
        }
    }
}
