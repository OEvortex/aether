/**
 * Credential storage for WeChat account.
 * Stores account data in ~/.aether/channels/weixin/ (legacy: ~/.qwen/channels/weixin/)
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
export const DEFAULT_BASE_URL = 'https://ilinkai.weixin.qq.com';
export function getStateDir() {
    const envDir = process.env['WEIXIN_STATE_DIR'];
    if (envDir) {
        if (!existsSync(envDir)) {
            mkdirSync(envDir, { recursive: true });
        }
        return envDir;
    }
    const defaultDir = join(homedir(), '.aether', 'channels', 'weixin');
    if (existsSync(defaultDir)) {
        return defaultDir;
    }
    const legacyDir = join(homedir(), '.qwen', 'channels', 'weixin');
    if (existsSync(legacyDir)) {
        return legacyDir;
    }
    mkdirSync(defaultDir, { recursive: true });
    return defaultDir;
}
function accountPath() {
    return join(getStateDir(), 'account.json');
}
export function loadAccount() {
    const p = accountPath();
    if (!existsSync(p)) {
        return null;
    }
    try {
        return JSON.parse(readFileSync(p, 'utf-8'));
    }
    catch {
        return null;
    }
}
export function saveAccount(data) {
    const p = accountPath();
    writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
    chmodSync(p, 0o600);
}
export function clearAccount() {
    const p = accountPath();
    if (existsSync(p)) {
        unlinkSync(p);
    }
}
//# sourceMappingURL=accounts.js.map