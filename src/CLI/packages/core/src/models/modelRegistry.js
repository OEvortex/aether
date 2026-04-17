/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import { DEFAULT_AETHER_MODEL } from '../config/models.js';
import { AuthType } from '../core/contentGenerator.js';
import { defaultModalities } from '../core/modalityDefaults.js';
import { DEFAULT_OPENAI_BASE_URL } from '../core/openaiContentGenerator/constants.js';
import { DEFAULT_CONTEXT_LENGTH, DEFAULT_MAX_OUTPUT_TOKENS, resolveGlobalTokenLimits } from '../index.js';
import { createDebugLogger } from '../utils/debugLogger.js';
import { AETHER_OAUTH_MODELS } from './constants.js';
const debugLogger = createDebugLogger('MODEL_REGISTRY');
export { AETHER_OAUTH_MODELS } from './constants.js';
/**
 * Validates if a string key is a valid AuthType enum value.
 * @param key - The key to validate
 * @returns The validated AuthType or undefined if invalid
 */
function validateAuthTypeKey(key) {
    // Check if the key is a valid AuthType enum value
    if (Object.values(AuthType).includes(key)) {
        return key;
    }
    // Invalid key
    return undefined;
}
/**
 * Central registry for managing model configurations.
 * Models are organized by authType.
 */
export class ModelRegistry {
    modelsByAuthType;
    getDefaultBaseUrl(authType) {
        switch (authType) {
            case AuthType.AETHER_OAUTH:
                return 'DYNAMIC_AETHER_OAUTH_BASE_URL';
            case AuthType.USE_OPENAI:
                return DEFAULT_OPENAI_BASE_URL;
            default:
                return '';
        }
    }
    constructor(modelProvidersConfig, runtimeModelProvidersConfig) {
        this.modelsByAuthType = new Map();
        // Always register aether-oauth models (hard-coded, cannot be overridden)
        this.registerAuthTypeModels(AuthType.AETHER_OAUTH, AETHER_OAUTH_MODELS);
        // Register user-configured models for other authTypes
        this.reloadModels(modelProvidersConfig, runtimeModelProvidersConfig);
    }
    /**
     * Register models for an authType.
     * If multiple models have the same id, the first one takes precedence.
     */
    registerAuthTypeModels(authType, models) {
        const modelMap = new Map();
        for (const config of models) {
            // Skip if a model with the same id is already registered (first one wins)
            if (modelMap.has(config.id)) {
                debugLogger.warn(`Duplicate model id "${config.id}" for authType "${authType}". Using the first registered config.`);
                continue;
            }
            const resolved = this.resolveModelConfig(config, authType);
            modelMap.set(config.id, resolved);
        }
        this.modelsByAuthType.set(authType, modelMap);
    }
    isSelectableModel(model) {
        return !model.fetchModels;
    }
    /**
     * Get all models for a specific authType.
     * This is used by /model command to show only relevant models.
     */
    getModelsForAuthType(authType) {
        const models = this.modelsByAuthType.get(authType);
        if (!models) {
            return [];
        }
        return Array.from(models.values())
            .filter((model) => this.isSelectableModel(model))
            .map((model) => ({
            id: model.id,
            label: model.name,
            description: model.description,
            capabilities: model.capabilities,
            authType: model.authType,
            provider: model.provider,
            isVision: model.capabilities?.vision ?? false,
            contextWindowSize: model.generationConfig.contextWindowSize ??
                resolveGlobalTokenLimits(model.id, DEFAULT_CONTEXT_LENGTH, {
                    defaultContextLength: DEFAULT_CONTEXT_LENGTH,
                    defaultMaxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS
                }).maxInputTokens,
            modalities: model.generationConfig.modalities ??
                defaultModalities(model.id),
            baseUrl: model.baseUrl,
            envKey: model.envKey
        }));
    }
    /**
     * Get model configuration by authType and modelId
     */
    getModel(authType, modelId) {
        const models = this.modelsByAuthType.get(authType);
        return models?.get(modelId);
    }
    /**
     * Check if model exists for given authType
     */
    hasModel(authType, modelId) {
        const models = this.modelsByAuthType.get(authType);
        return models?.has(modelId) ?? false;
    }
    /**
     * Get default model for an authType.
     * For aether-oauth, returns the coder model.
     * For others, returns the first configured model.
     */
    getDefaultModelForAuthType(authType) {
        if (authType === AuthType.AETHER_OAUTH) {
            return this.getModel(authType, DEFAULT_AETHER_MODEL);
        }
        const models = this.modelsByAuthType.get(authType);
        if (!models || models.size === 0) {
            return undefined;
        }
        return Array.from(models.values()).find((model) => this.isSelectableModel(model));
    }
    /**
     * Resolve model config by applying defaults
     */
    resolveModelConfig(config, authType) {
        this.validateModelConfig(config, authType);
        return {
            ...config,
            authType,
            name: config.name || config.id,
            baseUrl: config.baseUrl || this.getDefaultBaseUrl(authType),
            generationConfig: config.generationConfig ?? {},
            capabilities: config.capabilities || {}
        };
    }
    /**
     * Validate model configuration
     */
    validateModelConfig(config, authType) {
        if (!config.id) {
            throw new Error(`Model config in authType '${authType}' missing required field: id`);
        }
    }
    /**
     * Reload models from updated configuration.
     * Clears existing user-configured models and re-registers from new config.
     * Preserves hard-coded aether-oauth models.
     */
    reloadModels(modelProvidersConfig, runtimeModelProvidersConfig) {
        // Clear existing user-configured models (preserve aether-oauth)
        for (const authType of this.modelsByAuthType.keys()) {
            if (authType !== AuthType.AETHER_OAUTH) {
                this.modelsByAuthType.delete(authType);
            }
        }
        // Re-register user-configured models for other authTypes
        const mergedConfigs = new Map();
        const appendConfig = (config) => {
            if (!config) {
                return;
            }
            for (const [rawKey, models] of Object.entries(config)) {
                const authType = validateAuthTypeKey(rawKey);
                if (!authType) {
                    debugLogger.warn(`Invalid authType key "${rawKey}" in modelProviders config. Expected one of: ${Object.values(AuthType).join(', ')}. Skipping.`);
                    continue;
                }
                if (authType === AuthType.AETHER_OAUTH) {
                    continue;
                }
                const existing = mergedConfigs.get(authType) || [];
                mergedConfigs.set(authType, [...existing, ...models]);
            }
        };
        appendConfig(runtimeModelProvidersConfig);
        appendConfig(modelProvidersConfig);
        for (const [authType, models] of mergedConfigs.entries()) {
            this.registerAuthTypeModels(authType, models);
        }
    }
}
//# sourceMappingURL=modelRegistry.js.map