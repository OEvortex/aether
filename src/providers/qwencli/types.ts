/*---------------------------------------------------------------------------------------------
 *  Qwen Code CLI Provider Types
 *--------------------------------------------------------------------------------------------*/

export interface QwenOAuthCredentials {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expiry_date: number; // Timestamp in milliseconds
    resource_url?: string;
}

export interface QwenTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    error?: string;
    error_description?: string;
    resource_url?: string;
}

export interface QwenDeviceCodeResponse {
    device_code: string;
    user_code: string;
    verification_uri: string;
    verification_uri_complete?: string;
    expires_in: number;
    interval?: number;
}

export interface QwenStoredOAuthAccountSummary {
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

export const QWEN_OAUTH_CLIENT_ID = 'f0304373b74a44d2b584a3fb70ca9e56';
export const QWEN_OAUTH_DEVICE_CODE_ENDPOINT =
    'https://chat.qwen.ai/api/v1/oauth2/device/code';
export const QWEN_OAUTH_TOKEN_ENDPOINT =
    'https://chat.qwen.ai/api/v1/oauth2/token';
export const QWEN_OAUTH_SCOPE = 'openid profile email model.completion';
export const QWEN_OAUTH_DEVICE_GRANT_TYPE =
    'urn:ietf:params:oauth:grant-type:device_code';
export const QWEN_OAUTH_VERIFICATION_CLIENT_PARAM = 'client=qwen-code';
export const QWEN_DEFAULT_BASE_URL =
    'https://dashscope.aliyuncs.com/compatible-mode/v1';
export const TOKEN_REFRESH_BUFFER_MS = 30 * 1000;
