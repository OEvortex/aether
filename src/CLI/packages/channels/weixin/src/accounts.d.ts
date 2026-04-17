/**
 * Credential storage for WeChat account.
 * Stores account data in ~/.aether/channels/weixin/ (legacy: ~/.qwen/channels/weixin/)
 */
export declare const DEFAULT_BASE_URL = "https://ilinkai.weixin.qq.com";
export interface AccountData {
    token: string;
    baseUrl: string;
    userId?: string;
    savedAt: string;
}
export declare function getStateDir(): string;
export declare function loadAccount(): AccountData | null;
export declare function saveAccount(data: AccountData): void;
export declare function clearAccount(): void;
