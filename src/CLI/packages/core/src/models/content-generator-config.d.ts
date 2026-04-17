/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Shared utilities for building per-agent ContentGeneratorConfig.
 *
 * Used by both InProcessBackend (Arena agents) and SubagentManager (regular
 * subagents) to create dedicated ContentGenerators when an agent targets a
 * different model or provider than the parent process.
 */
import type { Config } from '../config/config.js';
import type { ContentGeneratorConfig } from '../core/contentGenerator.js';
export interface AuthOverrides {
    authType: string;
    apiKey?: string;
    baseUrl?: string;
}
/**
 * Build a ContentGeneratorConfig for a per-agent ContentGenerator.
 * Inherits operational settings (timeout, retries, proxy, sampling, etc.)
 * from the parent's config and overlays the agent-specific auth fields.
 *
 * For cross-provider agents the parent's API key / base URL are invalid,
 * so we resolve credentials from the provider-specific environment
 * variables (e.g. ANTHROPIC_API_KEY, ANTHROPIC_BASE_URL). This mirrors
 * what a PTY subprocess does during its own initialization.
 */
export declare function buildAgentContentGeneratorConfig(base: Config, modelId: string | undefined, authOverrides: AuthOverrides): ContentGeneratorConfig;
/**
 * Resolve a credential field (apiKey or baseUrl) with the following
 * priority: explicit override → same-provider parent value.
 * Note: Environment variables are no longer used - credentials must come from settings.
 */
export declare function resolveCredentialField(explicitValue: string | undefined, inheritedValue: string | undefined, _authType: string, _field: 'apiKey' | 'baseUrl'): string | undefined;
