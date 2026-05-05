/*---------------------------------------------------------------------------------------------
 *  Gemini Code CLI Provider Types
 *--------------------------------------------------------------------------------------------*/

export interface GeminiOAuthCredentials {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expiry_date: number; // Timestamp in milliseconds
    resource_url?: string;
}

export interface GeminiTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    error?: string;
    error_description?: string;
    resource_url?: string;
}

export interface GeminiDeviceCodeResponse {
    device_code: string;
    user_code: string;
    verification_uri: string;
    verification_uri_complete?: string;
    expires_in: number;
    interval?: number;
}

export interface GeminiStoredOAuthAccountSummary {
    accountId: string;
    accountKey?: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    resourceUrl?: string;
    baseURL: string;
    exhaustedUntil: number;
    isActive: boolean;
    email?: string;
}

export const GEMINI_OAUTH_CLIENT_ID =
    '681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com';
export const GEMINI_OAUTH_DEVICE_CODE_ENDPOINT =
    'https://accounts.google.com/o/oauth2/device/code';
export const GEMINI_OAUTH_TOKEN_ENDPOINT =
    'https://accounts.google.com/o/oauth2/token';
export const GEMINI_OAUTH_SCOPE =
    'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
export const GEMINI_OAUTH_DEVICE_GRANT_TYPE =
    'urn:ietf:params:oauth:grant-type:device_code';
export const GEMINI_OAUTH_VERIFICATION_CLIENT_PARAM = 'client=qwen-code';
export const GEMINI_DEFAULT_BASE_URL =
    'https://cloudcode-pa.googleapis.com';
export const TOKEN_REFRESH_BUFFER_MS = 30 * 1000;
