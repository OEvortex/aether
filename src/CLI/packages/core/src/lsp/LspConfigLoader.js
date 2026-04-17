/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { recursivelyHydrateStrings } from '../extension/variables.js';
import { createDebugLogger } from '../utils/debugLogger.js';
const debugLogger = createDebugLogger('LSP');
export class LspConfigLoader {
    workspaceRoot;
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
    }
    /**
     * Load user .lsp.json configuration.
     * Supports basic format: { "language": { "command": "...", "extensionToLanguage": {...} } }
     */
    async loadUserConfigs() {
        const lspConfigPath = path.join(this.workspaceRoot, '.lsp.json');
        if (!fs.existsSync(lspConfigPath)) {
            return [];
        }
        try {
            const configContent = fs.readFileSync(lspConfigPath, 'utf-8');
            const data = JSON.parse(configContent);
            return this.parseConfigSource(data, lspConfigPath);
        }
        catch (error) {
            debugLogger.warn('Failed to load user .lsp.json config:', error);
            return [];
        }
    }
    /**
     * Load LSP configurations declared by extensions (Claude plugins).
     */
    async loadExtensionConfigs(extensions) {
        const configs = [];
        for (const extension of extensions) {
            const lspServers = extension.config?.lspServers;
            if (!lspServers) {
                continue;
            }
            const originBase = `extension ${extension.name}`;
            if (typeof lspServers === 'string') {
                const configPath = this.resolveExtensionConfigPath(extension.path, lspServers);
                if (!fs.existsSync(configPath)) {
                    debugLogger.warn(`LSP config not found for ${originBase}: ${configPath}`);
                    continue;
                }
                try {
                    const configContent = fs.readFileSync(configPath, 'utf-8');
                    const data = JSON.parse(configContent);
                    const hydrated = this.hydrateExtensionLspConfig(data, extension.path);
                    configs.push(...this.parseConfigSource(hydrated, `${originBase} (${configPath})`));
                }
                catch (error) {
                    debugLogger.warn(`Failed to load extension LSP config from ${configPath}:`, error);
                }
            }
            else if (this.isRecord(lspServers)) {
                const hydrated = this.hydrateExtensionLspConfig(lspServers, extension.path);
                configs.push(...this.parseConfigSource(hydrated, `${originBase} (lspServers)`));
            }
            else {
                debugLogger.warn(`LSP config for ${originBase} must be an object or a JSON file path.`);
            }
        }
        return configs;
    }
    /**
     * Merge configs: extension configs + user configs
     * Note: Built-in presets are disabled. LSP servers must be explicitly configured
     * by the user via .lsp.json or through extensions.
     */
    mergeConfigs(_detectedLanguages, extensionConfigs, userConfigs) {
        // Merge configs, user configs take priority
        const mergedConfigs = [];
        const applyConfigs = (configs) => {
            for (const config of configs) {
                // Find if there's a preset with the same name, if so replace it
                const existingIndex = mergedConfigs.findIndex((c) => c.name === config.name);
                if (existingIndex !== -1) {
                    mergedConfigs[existingIndex] = config;
                }
                else {
                    mergedConfigs.push(config);
                }
            }
        };
        applyConfigs(extensionConfigs);
        applyConfigs(userConfigs);
        return mergedConfigs;
    }
    collectExtensionToLanguageOverrides(configs) {
        const overrides = {};
        for (const config of configs) {
            if (!config.extensionToLanguage) {
                continue;
            }
            for (const [key, value] of Object.entries(config.extensionToLanguage)) {
                if (typeof value !== 'string') {
                    continue;
                }
                const normalized = key.startsWith('.') ? key.slice(1) : key;
                if (!normalized) {
                    continue;
                }
                overrides[normalized.toLowerCase()] = value;
            }
        }
        return overrides;
    }
    /**
     * Parse configuration source and extract server configs.
     * Expects basic format keyed by language identifier.
     */
    parseConfigSource(source, origin) {
        if (!this.isRecord(source)) {
            return [];
        }
        const configs = [];
        for (const [key, spec] of Object.entries(source)) {
            if (!this.isRecord(spec)) {
                continue;
            }
            // In basic format: key is language name, server name comes from command.
            const languages = [key];
            const name = typeof spec.command === 'string'
                ? spec.command
                : key;
            const config = this.buildServerConfig(name, languages, spec, origin);
            if (config) {
                configs.push(config);
            }
        }
        return configs;
    }
    resolveExtensionConfigPath(extensionPath, configPath) {
        return path.isAbsolute(configPath)
            ? path.resolve(configPath)
            : path.resolve(extensionPath, configPath);
    }
    hydrateExtensionLspConfig(source, extensionPath) {
        return recursivelyHydrateStrings(source, {
            extensionPath,
            CLAUDE_PLUGIN_ROOT: extensionPath,
            workspacePath: this.workspaceRoot,
            '/': path.sep,
            pathSeparator: path.sep
        });
    }
    buildServerConfig(name, languages, spec, origin) {
        const transport = this.normalizeTransport(spec.transport);
        const command = typeof spec.command === 'string'
            ? spec.command
            : undefined;
        const args = this.normalizeStringArray(spec.args) ?? [];
        const env = this.normalizeEnv(spec.env);
        const initializationOptions = this.isRecord(spec.initializationOptions)
            ? spec.initializationOptions
            : undefined;
        const settings = this.isRecord(spec.settings)
            ? spec.settings
            : undefined;
        const extensionToLanguage = this.normalizeExtensionToLanguage(spec.extensionToLanguage);
        const workspaceFolder = this.resolveWorkspaceFolder(spec.workspaceFolder);
        const rootUri = pathToFileURL(workspaceFolder).toString();
        const startupTimeout = this.normalizeTimeout(spec.startupTimeout);
        const shutdownTimeout = this.normalizeTimeout(spec.shutdownTimeout);
        const restartOnCrash = typeof spec.restartOnCrash === 'boolean'
            ? spec.restartOnCrash
            : undefined;
        const maxRestarts = this.normalizeMaxRestarts(spec.maxRestarts);
        const trustRequired = typeof spec.trustRequired === 'boolean'
            ? spec.trustRequired
            : true;
        const socket = this.normalizeSocketOptions(spec);
        if (transport === 'stdio' && !command) {
            debugLogger.warn(`LSP config error in ${origin}: ${name} missing command`);
            return null;
        }
        if (transport !== 'stdio' && !socket) {
            debugLogger.warn(`LSP config error in ${origin}: ${name} missing socket info`);
            return null;
        }
        return {
            name,
            languages,
            command,
            args,
            transport,
            env,
            initializationOptions,
            settings,
            extensionToLanguage,
            rootUri,
            workspaceFolder,
            startupTimeout,
            shutdownTimeout,
            restartOnCrash,
            maxRestarts,
            trustRequired,
            socket
        };
    }
    isRecord(value) {
        return (typeof value === 'object' && value !== null && !Array.isArray(value));
    }
    normalizeStringArray(value) {
        if (!Array.isArray(value)) {
            return undefined;
        }
        return value.filter((item) => typeof item === 'string');
    }
    normalizeEnv(value) {
        if (!this.isRecord(value)) {
            return undefined;
        }
        const env = {};
        for (const [key, val] of Object.entries(value)) {
            if (typeof val === 'string' ||
                typeof val === 'number' ||
                typeof val === 'boolean') {
                env[key] = String(val);
            }
        }
        return Object.keys(env).length > 0 ? env : undefined;
    }
    normalizeExtensionToLanguage(value) {
        if (!this.isRecord(value)) {
            return undefined;
        }
        const mapping = {};
        for (const [key, lang] of Object.entries(value)) {
            if (typeof lang !== 'string') {
                continue;
            }
            const normalized = key.startsWith('.') ? key.slice(1) : key;
            if (!normalized) {
                continue;
            }
            mapping[normalized.toLowerCase()] = lang;
        }
        return Object.keys(mapping).length > 0 ? mapping : undefined;
    }
    normalizeTransport(value) {
        if (typeof value !== 'string') {
            return 'stdio';
        }
        const normalized = value.toLowerCase();
        if (normalized === 'tcp' || normalized === 'socket') {
            return normalized;
        }
        return 'stdio';
    }
    normalizeTimeout(value) {
        if (typeof value !== 'number') {
            return undefined;
        }
        if (!Number.isFinite(value) || value <= 0) {
            return undefined;
        }
        return value;
    }
    normalizeMaxRestarts(value) {
        if (typeof value !== 'number') {
            return undefined;
        }
        if (!Number.isFinite(value) || value < 0) {
            return undefined;
        }
        return value;
    }
    normalizeSocketOptions(value) {
        const socketValue = value.socket;
        if (typeof socketValue === 'string') {
            return { path: socketValue };
        }
        const source = this.isRecord(socketValue) ? socketValue : value;
        const host = typeof source.host === 'string'
            ? source.host
            : undefined;
        const pathValue = typeof source.path === 'string'
            ? source.path
            : typeof source.socketPath === 'string'
                ? source.socketPath
                : undefined;
        const portValue = source.port;
        const port = typeof portValue === 'number'
            ? portValue
            : typeof portValue === 'string'
                ? Number(portValue)
                : undefined;
        const socket = {};
        if (host) {
            socket.host = host;
        }
        if (Number.isFinite(port) && port > 0) {
            socket.port = port;
        }
        if (pathValue) {
            socket.path = pathValue;
        }
        if (!socket.path && !socket.port) {
            return undefined;
        }
        return socket;
    }
    resolveWorkspaceFolder(value) {
        if (typeof value !== 'string' || value.trim() === '') {
            return this.workspaceRoot;
        }
        const resolved = path.isAbsolute(value)
            ? path.resolve(value)
            : path.resolve(this.workspaceRoot, value);
        const root = path.resolve(this.workspaceRoot);
        if (resolved === root || resolved.startsWith(root + path.sep)) {
            return resolved;
        }
        debugLogger.warn(`LSP workspaceFolder must be within ${this.workspaceRoot}; using workspace root instead.`);
        return this.workspaceRoot;
    }
}
//# sourceMappingURL=LspConfigLoader.js.map