/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ExtensionOriginSource, TelemetrySettings } from '../config/config.js';
import type { HookDefinition, HookEventName } from '../hooks/types.js';
import type { ClaudeMarketplaceConfig, ExtensionInstallMetadata, MCPServerConfig, SkillConfig, SubagentConfig } from '../index.js';
import { Config } from '../index.js';
import type { ExtensionSetting, ResolvedExtensionSetting } from './extensionSettings.js';
import type { LoadExtensionContext } from './variableSchema.js';
export declare enum SettingScope {
    User = "User",
    Workspace = "Workspace",
    System = "System",
    SystemDefaults = "SystemDefaults"
}
export interface ExtensionChannelConfig {
    /** Relative path to JS entry point (must export `plugin: ChannelPlugin`) */
    entry: string;
    /** Human-readable name for CLI output */
    displayName?: string;
    /** Extra config fields required beyond the shared ChannelConfig fields */
    requiredConfigFields?: string[];
}
export interface Extension {
    id: string;
    name: string;
    version: string;
    isActive: boolean;
    path: string;
    config: ExtensionConfig;
    installMetadata?: ExtensionInstallMetadata;
    mcpServers?: Record<string, MCPServerConfig>;
    contextFiles: string[];
    settings?: ExtensionSetting[];
    resolvedSettings?: ResolvedExtensionSetting[];
    commands?: string[];
    skills?: SkillConfig[];
    agents?: SubagentConfig[];
    hooks?: {
        [K in HookEventName]?: HookDefinition[];
    };
    channels?: Record<string, ExtensionChannelConfig>;
}
export interface ExtensionConfig {
    name: string;
    version: string;
    mcpServers?: Record<string, MCPServerConfig>;
    lspServers?: string | Record<string, unknown>;
    contextFileName?: string | string[];
    commands?: string | string[];
    skills?: string | string[];
    agents?: string | string[];
    settings?: ExtensionSetting[];
    hooks?: {
        [K in HookEventName]?: HookDefinition[];
    };
    channels?: Record<string, ExtensionChannelConfig>;
}
export interface ExtensionUpdateInfo {
    name: string;
    originalVersion: string;
    updatedVersion: string;
}
export interface ExtensionUpdateStatus {
    status: ExtensionUpdateState;
    processed: boolean;
}
export declare enum ExtensionUpdateState {
    CHECKING_FOR_UPDATES = "checking for updates",
    UPDATED_NEEDS_RESTART = "updated, needs restart",
    UPDATING = "updating",
    UPDATED = "updated",
    UPDATE_AVAILABLE = "update available",
    UP_TO_DATE = "up to date",
    ERROR = "error",
    NOT_UPDATABLE = "not updatable",
    UNKNOWN = "unknown"
}
export type ExtensionRequestOptions = {
    extensionConfig: ExtensionConfig;
    originSource: ExtensionOriginSource;
    commands?: string[];
    skills?: SkillConfig[];
    subagents?: SubagentConfig[];
    previousExtensionConfig?: ExtensionConfig;
    previousCommands?: string[];
    previousSkills?: SkillConfig[];
    previousSubagents?: SubagentConfig[];
};
export interface ExtensionManagerOptions {
    /** Working directory for project-level extensions */
    workspaceDir?: string;
    /** Override list of enabled extension names (from CLI -e flag) */
    enabledExtensionOverrides?: string[];
    isWorkspaceTrusted: boolean;
    telemetrySettings?: TelemetrySettings;
    config?: Config;
    requestConsent?: (options?: ExtensionRequestOptions) => Promise<void>;
    requestSetting?: (setting: ExtensionSetting) => Promise<string>;
    requestChoicePlugin?: (marketplace: ClaudeMarketplaceConfig) => Promise<string>;
}
export declare class ExtensionManager {
    private extensionCache;
    private readonly configDir;
    private readonly configFilePath;
    private readonly enabledExtensionNamesOverride;
    private readonly workspaceDir;
    private config?;
    private telemetrySettings?;
    private isWorkspaceTrusted;
    private requestConsent;
    private requestSetting?;
    private requestChoicePlugin;
    constructor(options: ExtensionManagerOptions);
    setConfig(config: Config): void;
    setRequestConsent(requestConsent: (options?: ExtensionRequestOptions) => Promise<void>): void;
    setRequestSetting(requestSetting?: (setting: ExtensionSetting) => Promise<string>): void;
    setRequestChoicePlugin(requestChoicePlugin: (marketplace: ClaudeMarketplaceConfig) => Promise<string>): void;
    /**
     * Validates that override extension names exist in the extensions list.
     */
    validateExtensionOverrides(extensions: Extension[]): void;
    /**
     * Determines if an extension is enabled based on its name and the current path.
     */
    isEnabled(extensionName: string, currentPath?: string): boolean;
    /**
     * Enables an extension at the specified scope.
     */
    enableExtension(name: string, scope: SettingScope, cwd?: string): Promise<void>;
    /**
     * Disables an extension at the specified scope.
     */
    disableExtension(name: string, scope: SettingScope, cwd?: string): Promise<void>;
    /**
     * Removes enablement configuration for an extension.
     */
    removeEnablementConfig(extensionName: string): void;
    private enableByPath;
    private disableByPath;
    private readEnablementConfig;
    private writeEnablementConfig;
    /**
     * Refreshes the extension cache from disk.
     */
    refreshCache(): Promise<void>;
    getLoadedExtensions(): Extension[];
    /**
     * Loads an extension by name.
     */
    loadExtensionByName(name: string, workspaceDir?: string): Promise<Extension | null>;
    loadExtensionsFromDir(dir: string): Promise<Extension[]>;
    loadExtension(context: LoadExtensionContext): Promise<Extension | null>;
    /**
     * Substitute variables in hook configurations, particularly ${CLAUDE_PLUGIN_ROOT}
     */
    private substituteHookVariables;
    loadInstallMetadata(extensionDir: string): ExtensionInstallMetadata | undefined;
    loadExtensionConfig(context: LoadExtensionContext): ExtensionConfig;
    /**
     * Installs an extension.
     */
    installExtension(installMetadata: ExtensionInstallMetadata, requestConsent?: (options?: ExtensionRequestOptions) => Promise<void>, requestSetting?: (setting: ExtensionSetting) => Promise<string>, cwd?: string, previousExtensionConfig?: ExtensionConfig): Promise<Extension>;
    /**
     * Uninstalls an extension.
     */
    uninstallExtension(extensionIdentifier: string, isUpdate: boolean, cwd?: string): Promise<void>;
    performWorkspaceExtensionMigration(extensions: Extension[], requestConsent: (options?: ExtensionRequestOptions) => Promise<void>, requestSetting?: (setting: ExtensionSetting) => Promise<string>): Promise<string[]>;
    checkForAllExtensionUpdates(callback: (extensionName: string, state: ExtensionUpdateState) => void): Promise<void>;
    updateExtension(extension: Extension, currentState: ExtensionUpdateState, callback: (extensionName: string, state: ExtensionUpdateState) => void, enableExtensionReloading?: boolean): Promise<ExtensionUpdateInfo | undefined>;
    updateAllUpdatableExtensions(extensionsState: Map<string, ExtensionUpdateStatus>, callback: (extensionName: string, state: ExtensionUpdateState) => void, enableExtensionReloading?: boolean): Promise<ExtensionUpdateInfo[]>;
    refreshMemory(): Promise<void>;
    refreshTools(): Promise<void>;
}
export declare function copyExtension(source: string, destination: string): Promise<void>;
export declare function getExtensionId(config: ExtensionConfig, installMetadata?: ExtensionInstallMetadata): string;
export declare function hashValue(value: string): string;
export declare function validateName(name: string): void;
