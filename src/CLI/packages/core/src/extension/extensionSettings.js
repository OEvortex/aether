/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as fsSync from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import prompts from 'prompts';
import { KeychainTokenStorage } from '../mcp/token-storage/keychain-token-storage.js';
import { createDebugLogger } from '../utils/debugLogger.js';
import { ExtensionStorage } from './storage.js';
import { EXTENSION_SETTINGS_FILENAME } from './variables.js';
const debugLogger = createDebugLogger('EXT_SETTINGS');
export var ExtensionSettingScope;
(function (ExtensionSettingScope) {
    ExtensionSettingScope["USER"] = "user";
    ExtensionSettingScope["WORKSPACE"] = "workspace";
})(ExtensionSettingScope || (ExtensionSettingScope = {}));
const getKeychainStorageName = (extensionName, extensionId, scope) => {
    const base = `Aether Extensions ${extensionName} ${extensionId}`;
    if (scope === ExtensionSettingScope.WORKSPACE) {
        return `${base} ${process.cwd()}`;
    }
    return base;
};
const getEnvFilePath = (extensionName, scope) => {
    if (scope === ExtensionSettingScope.WORKSPACE) {
        return path.join(process.cwd(), EXTENSION_SETTINGS_FILENAME);
    }
    return new ExtensionStorage(extensionName).getEnvFilePath();
};
export async function maybePromptForSettings(extensionConfig, extensionId, requestSetting, previousExtensionConfig, previousSettings) {
    const { name: extensionName, settings } = extensionConfig;
    if ((!settings || settings.length === 0) &&
        (!previousExtensionConfig?.settings ||
            previousExtensionConfig.settings.length === 0)) {
        return;
    }
    // We assume user scope here because we don't have a way to ask the user for scope during the initial setup.
    // The user can change the scope later using the `settings set` command.
    const scope = ExtensionSettingScope.USER;
    const envFilePath = getEnvFilePath(extensionName, scope);
    const keychain = new KeychainTokenStorage(getKeychainStorageName(extensionName, extensionId, scope));
    if (!settings || settings.length === 0) {
        await clearSettings(envFilePath, keychain);
        return;
    }
    const settingsChanges = getSettingsChanges(settings, previousExtensionConfig?.settings ?? []);
    const allSettings = { ...previousSettings };
    for (const removedEnvSetting of settingsChanges.removeEnv) {
        delete allSettings[removedEnvSetting.envVar];
    }
    for (const removedSensitiveSetting of settingsChanges.removeSensitive) {
        await keychain.deleteSecret(removedSensitiveSetting.envVar);
    }
    for (const setting of settingsChanges.promptForSensitive.concat(settingsChanges.promptForEnv)) {
        const answer = await requestSetting(setting);
        allSettings[setting.envVar] = answer;
    }
    const nonSensitiveSettings = {};
    for (const setting of settings) {
        const value = allSettings[setting.envVar];
        if (value === undefined) {
            continue;
        }
        if (setting.sensitive) {
            await keychain.setSecret(setting.envVar, value);
        }
        else {
            nonSensitiveSettings[setting.envVar] = value;
        }
    }
    const envContent = formatEnvContent(nonSensitiveSettings);
    await fs.writeFile(envFilePath, envContent);
}
function formatEnvContent(settings) {
    let envContent = '';
    for (const [key, value] of Object.entries(settings)) {
        const formattedValue = value.includes(' ') ? `"${value}"` : value;
        envContent += `${key}=${formattedValue}\n`;
    }
    return envContent;
}
export async function promptForSetting(setting) {
    const response = await prompts({
        type: setting.sensitive ? 'password' : 'text',
        name: 'value',
        message: `${setting.name}\n${setting.description}`
    });
    return response.value;
}
export async function getScopedEnvContents(extensionConfig, extensionId, scope) {
    const { name: extensionName } = extensionConfig;
    const keychain = new KeychainTokenStorage(getKeychainStorageName(extensionName, extensionId, scope));
    const envFilePath = getEnvFilePath(extensionName, scope);
    let customEnv = {};
    if (fsSync.existsSync(envFilePath)) {
        const envFile = fsSync.readFileSync(envFilePath, 'utf-8');
        customEnv = dotenv.parse(envFile);
    }
    if (extensionConfig.settings) {
        for (const setting of extensionConfig.settings) {
            if (setting.sensitive) {
                const secret = await keychain.getSecret(setting.envVar);
                if (secret) {
                    customEnv[setting.envVar] = secret;
                }
            }
        }
    }
    return customEnv;
}
export async function getEnvContents(extensionConfig, extensionId) {
    if (!extensionConfig.settings || extensionConfig.settings.length === 0) {
        return Promise.resolve({});
    }
    const userSettings = await getScopedEnvContents(extensionConfig, extensionId, ExtensionSettingScope.USER);
    const workspaceSettings = await getScopedEnvContents(extensionConfig, extensionId, ExtensionSettingScope.WORKSPACE);
    return { ...userSettings, ...workspaceSettings };
}
export async function updateSetting(extensionConfig, extensionId, settingKey, requestSetting, scope) {
    const { name: extensionName, settings } = extensionConfig;
    if (!settings || settings.length === 0) {
        debugLogger.debug(`updateSetting: Extension "${extensionName}" has no settings`);
        return;
    }
    const settingToUpdate = settings.find((s) => s.name === settingKey || s.envVar === settingKey);
    if (!settingToUpdate) {
        debugLogger.debug(`updateSetting: Setting "${settingKey}" not found for extension "${extensionName}"`);
        return;
    }
    const newValue = await requestSetting(settingToUpdate);
    const keychain = new KeychainTokenStorage(getKeychainStorageName(extensionName, extensionId, scope));
    if (settingToUpdate.sensitive) {
        await keychain.setSecret(settingToUpdate.envVar, newValue);
        return;
    }
    // For non-sensitive settings, we need to read the existing .env file,
    // update the value, and write it back, preserving any other values.
    const envFilePath = getEnvFilePath(extensionName, scope);
    let envContent = '';
    if (fsSync.existsSync(envFilePath)) {
        envContent = await fs.readFile(envFilePath, 'utf-8');
    }
    const parsedEnv = dotenv.parse(envContent);
    parsedEnv[settingToUpdate.envVar] = newValue;
    // We only want to write back the variables that are not sensitive.
    const nonSensitiveSettings = {};
    const sensitiveEnvVars = new Set(settings.filter((s) => s.sensitive).map((s) => s.envVar));
    for (const [key, value] of Object.entries(parsedEnv)) {
        if (!sensitiveEnvVars.has(key)) {
            nonSensitiveSettings[key] = value;
        }
    }
    const newEnvContent = formatEnvContent(nonSensitiveSettings);
    await fs.writeFile(envFilePath, newEnvContent);
}
function getSettingsChanges(settings, oldSettings) {
    const isSameSetting = (a, b) => a.envVar === b.envVar &&
        (a.sensitive ?? false) === (b.sensitive ?? false);
    const sensitiveOld = oldSettings.filter((s) => s.sensitive ?? false);
    const sensitiveNew = settings.filter((s) => s.sensitive ?? false);
    const envOld = oldSettings.filter((s) => !(s.sensitive ?? false));
    const envNew = settings.filter((s) => !(s.sensitive ?? false));
    return {
        promptForSensitive: sensitiveNew.filter((s) => !sensitiveOld.some((old) => isSameSetting(s, old))),
        removeSensitive: sensitiveOld.filter((s) => !sensitiveNew.some((neu) => isSameSetting(s, neu))),
        promptForEnv: envNew.filter((s) => !envOld.some((old) => isSameSetting(s, old))),
        removeEnv: envOld.filter((s) => !envNew.some((neu) => isSameSetting(s, neu)))
    };
}
async function clearSettings(envFilePath, keychain) {
    if (fsSync.existsSync(envFilePath)) {
        await fs.writeFile(envFilePath, '');
    }
    if (!(await keychain.isAvailable())) {
        return;
    }
    const secrets = await keychain.listSecrets();
    for (const secret of secrets) {
        await keychain.deleteSecret(secret);
    }
    return;
}
//# sourceMappingURL=extensionSettings.js.map