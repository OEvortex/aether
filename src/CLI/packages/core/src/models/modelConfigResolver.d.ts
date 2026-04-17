/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ContentGeneratorConfig } from '../core/contentGenerator.js';
import { AuthType } from '../core/contentGenerator.js';
import { type ConfigSources } from '../utils/configResolver.js';
import type { ModelConfig as ModelProviderConfig } from './types.js';
export { type ModelConfigValidationResult, validateModelConfig } from '../core/contentGenerator.js';
/**
 * CLI-provided configuration values
 */
export interface ModelConfigCliInput {
    model?: string;
    apiKey?: string;
    baseUrl?: string;
}
/**
 * Settings-provided configuration values
 */
export interface ModelConfigSettingsInput {
    /** Model name from settings.model.name */
    model?: string;
    /** API key from settings.security.auth.apiKey */
    apiKey?: string;
    /** Base URL from settings.security.auth.baseUrl */
    baseUrl?: string;
    /** Generation config from settings.model.generationConfig */
    generationConfig?: Partial<ContentGeneratorConfig>;
}
/**
 * All input sources for model configuration resolution
 */
export interface ModelConfigSourcesInput {
    /** Authentication type */
    authType?: AuthType;
    /** CLI arguments (highest priority for user-provided values) */
    cli?: ModelConfigCliInput;
    /** Settings file configuration */
    settings?: ModelConfigSettingsInput;
    /** Environment variables (injected for testability) */
    env: Record<string, string | undefined>;
    /** Model from ModelProviders (explicit selection, highest priority) */
    modelProvider?: ModelProviderConfig;
    /** Proxy URL (computed from Config) */
    proxy?: string;
}
/**
 * Result of model configuration resolution
 */
export interface ModelConfigResolutionResult {
    /** The fully resolved configuration */
    config: ContentGeneratorConfig;
    /** Source attribution for each field */
    sources: ConfigSources;
    /** Warnings generated during resolution */
    warnings: string[];
}
/**
 * Resolve model configuration from all input sources.
 *
 * This is the single entry point for model configuration resolution.
 * It replaces the duplicate logic in:
 * - packages/cli/src/utils/modelProviderUtils.ts (resolveCliGenerationConfig)
 * - packages/core/src/core/contentGenerator.ts (resolveContentGeneratorConfigWithSources)
 *
 * @param input - All configuration sources
 * @returns Resolved configuration with source tracking
 */
export declare function resolveModelConfig(input: ModelConfigSourcesInput): ModelConfigResolutionResult;
