/*---------------------------------------------------------------------------------------------
 *  Gemini OAuth Types
 *--------------------------------------------------------------------------------------------*/

export const GEMINI_CLIENT_ID =
    '681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com';

export const GEMINI_CLIENT_SECRET = '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';

export const GEMINI_REDIRECT_URI = 'http://localhost:8085/oauth2callback';

export const GEMINI_OAUTH_TOKEN_ENDPOINT =
    'https://oauth2.googleapis.com/token';

export const GEMINI_OAUTH_SCOPE = [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
];

export const GEMINI_DEFAULT_BASE_URL =
    'https://generativelanguage.googleapis.com';

export const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

export interface GeminiOAuthCredentials {
    access_token: string;
    token_type: string;
    refresh_token?: string;
    expiry_date: number;
    resource_url?: string;
}

export interface GeminiTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
}
