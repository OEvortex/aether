/**
 * QR code login flow for WeChat iLink Bot.
 */
export interface LoginResult {
    connected: boolean;
    token?: string;
    baseUrl?: string;
    userId?: string;
    message: string;
}
export declare function startLogin(apiBaseUrl: string): Promise<string>;
export declare function waitForLogin(params: {
    qrcodeId: string;
    apiBaseUrl: string;
    timeoutMs?: number;
}): Promise<LoginResult>;
