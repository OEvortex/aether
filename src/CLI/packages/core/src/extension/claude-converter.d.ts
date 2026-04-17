/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { MCPServerConfig } from '../config/config.js';
import type { HookDefinition, HookEventName } from '../hooks/types.js';
import type { ExtensionConfig } from './extensionManager.js';
export interface ClaudePluginConfig {
    name: string;
    version: string;
    description?: string;
    author?: {
        name?: string;
        email?: string;
        url?: string;
    };
    homepage?: string;
    repository?: string;
    license?: string;
    keywords?: string[];
    commands?: string | string[];
    agents?: string | string[];
    skills?: string | string[];
    hooks?: string | {
        [K in HookEventName]?: HookDefinition[];
    };
    mcpServers?: string | Record<string, MCPServerConfig>;
    outputStyles?: string | string[];
    lspServers?: string | Record<string, unknown>;
}
/**
 * Claude Code subagent configuration format.
 * Based on https://code.claude.com/docs/en/sub-agents
 */
export interface ClaudeAgentConfig {
    /** Unique identifier using lowercase letters and hyphens */
    name: string;
    /** When Claude should delegate to this subagent */
    description: string;
    /** Tools the subagent can use. Inherits all tools if omitted */
    tools?: string[];
    /** Tools to deny, removed from inherited or specified list */
    disallowedTools?: string[];
    /** Model to use: sonnet, opus, haiku, or inherit */
    model?: string;
    /** Permission mode: default, acceptEdits, dontAsk, bypassPermissions, or plan */
    permissionMode?: string;
    /** Skills to load into the subagent's context at startup */
    skills?: string[];
    /** Hooks configuration */
    hooks?: unknown;
    /** System prompt content */
    systemPrompt?: string;
    /** subagent color */
    color?: string;
}
export type ClaudePluginSource = {
    source: 'github';
    repo: string;
} | {
    source: 'url';
    url: string;
};
export interface ClaudeMarketplacePluginConfig extends ClaudePluginConfig {
    source: string | ClaudePluginSource;
    category?: string;
    strict?: boolean;
    tags?: string[];
}
export interface ClaudeMarketplaceConfig {
    name: string;
    owner: {
        name: string;
        email: string;
    };
    plugins: ClaudeMarketplacePluginConfig[];
    metadata?: {
        description?: string;
        version?: string;
        pluginRoot?: string;
    };
}
/**
 * Converts a Claude agent config to Aether subagent format.
 * @param claudeAgent Claude agent configuration
 * @returns Converted agent config compatible with Qwen Code SubagentConfig
 */
export declare function convertClaudeAgentConfig(claudeAgent: ClaudeAgentConfig): Record<string, unknown>;
/**
 * Converts a Claude plugin config to Aether format.
 * @param claudeConfig Claude plugin configuration
 * @returns Qwen ExtensionConfig
 */
export declare function convertClaudeToQwenConfig(claudeConfig: ClaudePluginConfig): ExtensionConfig;
/**
 * Converts a complete Claude plugin package to Aether format.
 * Creates a new temporary directory with:
 * 1. Converted aether-extension.json
 * 2. Commands, skills, and agents collected to respective folders
 * 3. MCP servers resolved from JSON files if needed
 * 4. All other files preserved
 */
export declare function convertClaudePluginPackage(extensionDir: string, pluginName: string): Promise<{
    config: ExtensionConfig;
    convertedDir: string;
}>;
/**
 * Merges marketplace plugin config with the actual plugin.json config.
 * Marketplace config takes precedence for conflicting fields.
 * @param marketplacePlugin Marketplace plugin definition
 * @param pluginConfig Actual plugin.json config (optional if strict=false)
 * @returns Merged Claude plugin config
 */
export declare function mergeClaudeConfigs(marketplacePlugin: ClaudeMarketplacePluginConfig, pluginConfig?: ClaudePluginConfig): ClaudePluginConfig;
/**
 * Checks if a config object is in Claude plugin format.
 * @param config Configuration object to check
 * @returns true if config appears to be Claude format
 */
export declare function isClaudePluginConfig(extensionDir: string, marketplace: {
    marketplaceSource: string;
    pluginName: string;
}): boolean;
