/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ExtensionConfig } from './extensionManager.js';
export interface ExtensionSetting {
    name: string;
    description: string;
    envVar: string;
    sensitive?: boolean;
}
export interface ResolvedExtensionSetting {
    name: string;
    envVar: string;
    value: string;
    sensitive: boolean;
}
export declare enum ExtensionSettingScope {
    USER = "user",
    WORKSPACE = "workspace"
}
export interface ExtensionSetting {
    name: string;
    description: string;
    envVar: string;
    sensitive?: boolean;
}
export declare function maybePromptForSettings(extensionConfig: ExtensionConfig, extensionId: string, requestSetting: (setting: ExtensionSetting) => Promise<string>, previousExtensionConfig?: ExtensionConfig, previousSettings?: Record<string, string>): Promise<void>;
export declare function promptForSetting(setting: ExtensionSetting): Promise<string>;
export declare function getScopedEnvContents(extensionConfig: ExtensionConfig, extensionId: string, scope: ExtensionSettingScope): Promise<Record<string, string>>;
export declare function getEnvContents(extensionConfig: ExtensionConfig, extensionId: string): Promise<Record<string, string>>;
export declare function updateSetting(extensionConfig: ExtensionConfig, extensionId: string, settingKey: string, requestSetting: (setting: ExtensionSetting) => Promise<string>, scope: ExtensionSettingScope): Promise<void>;
