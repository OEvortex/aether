/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import { AuthType } from '../core/contentGenerator.js';
import type { AvailableModel, ModelProvidersConfig, ResolvedModelConfig } from './types.js';
export { AETHER_OAUTH_MODELS } from './constants.js';
/**
 * Central registry for managing model configurations.
 * Models are organized by authType.
 */
export declare class ModelRegistry {
    private modelsByAuthType;
    private getDefaultBaseUrl;
    constructor(modelProvidersConfig?: ModelProvidersConfig, runtimeModelProvidersConfig?: ModelProvidersConfig);
    /**
     * Register models for an authType.
     * If multiple models have the same id, the first one takes precedence.
     */
    private registerAuthTypeModels;
    private isSelectableModel;
    /**
     * Get all models for a specific authType.
     * This is used by /model command to show only relevant models.
     */
    getModelsForAuthType(authType: AuthType): AvailableModel[];
    /**
     * Get model configuration by authType and modelId
     */
    getModel(authType: AuthType, modelId: string): ResolvedModelConfig | undefined;
    /**
     * Check if model exists for given authType
     */
    hasModel(authType: AuthType, modelId: string): boolean;
    /**
     * Get default model for an authType.
     * For aether-oauth, returns the coder model.
     * For others, returns the first configured model.
     */
    getDefaultModelForAuthType(authType: AuthType): ResolvedModelConfig | undefined;
    /**
     * Resolve model config by applying defaults
     */
    private resolveModelConfig;
    /**
     * Validate model configuration
     */
    private validateModelConfig;
    /**
     * Reload models from updated configuration.
     * Clears existing user-configured models and re-registers from new config.
     * Preserves hard-coded aether-oauth models.
     */
    reloadModels(modelProvidersConfig?: ModelProvidersConfig, runtimeModelProvidersConfig?: ModelProvidersConfig): void;
}
