/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * ModelConfigResolver - Unified resolver for model-related configuration.
 *
 * This module consolidates all model configuration resolution logic,
 * eliminating duplicate code between CLI and Core layers.
 *
 * Configuration priority (highest to lowest):
 * 1. modelProvider - Explicit selection from ModelProviders config
 * 2. CLI arguments - Command line flags (--model, --openaiApiKey, etc.)
 * 3. Environment variables - OPENAI_API_KEY, OPENAI_MODEL, etc.
 * 4. Settings - User/workspace settings file
 * 5. Defaults - Built-in default values
 */
import { DEFAULT_AETHER_MODEL } from '../config/models.js';
import { AuthType } from '../core/contentGenerator.js';
import { cliSource, computedSource, defaultSource, envLayer, layer, modelProvidersSource, resolveField, resolveOptionalField, settingsSource } from '../utils/configResolver.js';
import { AETHER_OAUTH_ALLOWED_MODELS, AUTH_ENV_MAPPINGS, DEFAULT_MODELS, MODEL_GENERATION_CONFIG_FIELDS } from './constants.js';
export { validateModelConfig } from '../core/contentGenerator.js';
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
export function resolveModelConfig(input) {
    const { authType, cli, settings, env, modelProvider, proxy } = input;
    const warnings = [];
    const sources = {};
    // Special handling for Aether OAuth
    if (authType === AuthType.AETHER_OAUTH) {
        return resolveaetherOAuthConfig(input, warnings);
    }
    // Get auth-specific env var mappings.
    // If authType is not provided, do not read any auth env vars.
    const envMapping = authType
        ? AUTH_ENV_MAPPINGS[authType]
        : { model: [], apiKey: [], baseUrl: [] };
    // Build layers for each field in priority order
    // Priority: modelProvider > cli > env > settings > default
    // ---- Model ----
    const modelLayers = [];
    if (authType && modelProvider) {
        modelLayers.push(layer(modelProvider.id, modelProvidersSource(authType, modelProvider.id, 'model.id')));
    }
    if (cli?.model) {
        modelLayers.push(layer(cli.model, cliSource('--model')));
    }
    for (const envKey of envMapping.model) {
        modelLayers.push(envLayer(env, envKey));
    }
    if (settings?.model) {
        modelLayers.push(layer(settings.model, settingsSource('model.name')));
    }
    const defaultModel = authType ? DEFAULT_MODELS[authType] : '';
    const modelResult = resolveField(modelLayers, defaultModel, defaultSource(defaultModel));
    sources.model = modelResult.source;
    // ---- API Key ----
    const apiKeyLayers = [];
    // For modelProvider, read from the specified envKey
    if (authType && modelProvider?.envKey) {
        const apiKeyFromEnv = env[modelProvider.envKey];
        if (apiKeyFromEnv) {
            apiKeyLayers.push(layer(apiKeyFromEnv, {
                kind: 'env',
                envKey: modelProvider.envKey,
                via: modelProvidersSource(authType, modelProvider.id, 'envKey')
            }));
        }
    }
    if (cli?.apiKey) {
        apiKeyLayers.push(layer(cli.apiKey, cliSource('--openaiApiKey')));
    }
    for (const envKey of envMapping.apiKey) {
        apiKeyLayers.push(envLayer(env, envKey));
    }
    if (settings?.apiKey) {
        apiKeyLayers.push(layer(settings.apiKey, settingsSource('security.auth.apiKey')));
    }
    const apiKeyResult = resolveOptionalField(apiKeyLayers);
    if (apiKeyResult) {
        sources.apiKey = apiKeyResult.source;
    }
    // ---- Base URL ----
    const baseUrlLayers = [];
    if (authType && modelProvider?.baseUrl) {
        baseUrlLayers.push(layer(modelProvider.baseUrl, modelProvidersSource(authType, modelProvider.id, 'baseUrl')));
    }
    if (cli?.baseUrl) {
        baseUrlLayers.push(layer(cli.baseUrl, cliSource('--openaiBaseUrl')));
    }
    for (const envKey of envMapping.baseUrl) {
        baseUrlLayers.push(envLayer(env, envKey));
    }
    if (settings?.baseUrl) {
        baseUrlLayers.push(layer(settings.baseUrl, settingsSource('security.auth.baseUrl')));
    }
    const baseUrlResult = resolveOptionalField(baseUrlLayers);
    if (baseUrlResult) {
        sources.baseUrl = baseUrlResult.source;
    }
    // ---- API Key Env Key (for error messages) ----
    let apiKeyEnvKey;
    if (authType && modelProvider?.envKey) {
        apiKeyEnvKey = modelProvider.envKey;
        sources.apiKeyEnvKey = modelProvidersSource(authType, modelProvider.id, 'envKey');
    }
    // ---- Generation Config (from settings or modelProvider) ----
    const generationConfig = resolveGenerationConfig(settings?.generationConfig, modelProvider?.generationConfig, authType, modelProvider?.id, sources);
    // Build final config
    const config = {
        authType,
        model: modelResult.value || '',
        apiKey: apiKeyResult?.value,
        apiKeyEnvKey,
        baseUrl: baseUrlResult?.value,
        proxy,
        ...generationConfig
    };
    // Add proxy source
    if (proxy) {
        sources.proxy = computedSource('Config.getProxy()');
    }
    // Add authType source
    sources.authType = computedSource('provided by caller');
    return { config, sources, warnings };
}
/**
 * Special resolver for Aether OAuth authentication.
 * Aether OAuth has fixed model options and uses dynamic tokens.
 */
function resolveaetherOAuthConfig(input, warnings) {
    const { cli, settings, proxy, modelProvider } = input;
    const sources = {};
    // Aether OAuth only allows specific models
    const allowedModels = new Set(AETHER_OAUTH_ALLOWED_MODELS);
    // Determine requested model
    const requestedModel = cli?.model || settings?.model;
    let resolvedModel;
    let modelSource;
    if (requestedModel && allowedModels.has(requestedModel)) {
        resolvedModel = requestedModel;
        modelSource = cli?.model
            ? cliSource('--model')
            : settingsSource('model.name');
    }
    else {
        if (requestedModel) {
            const isVisionModel = requestedModel.includes('vl') ||
                requestedModel.includes('vision');
            const extraMessage = isVisionModel
                ? ` Note: vision-model has been removed since coder-model now supports vision capabilities.`
                : '';
            warnings.push(`Warning: Unsupported Aether OAuth model '${requestedModel}', falling back to '${DEFAULT_AETHER_MODEL}'.${extraMessage}`);
        }
        resolvedModel = DEFAULT_AETHER_MODEL;
        modelSource = defaultSource(`fallback to '${DEFAULT_AETHER_MODEL}'`);
    }
    sources.model = modelSource;
    sources.apiKey = computedSource('Aether OAuth dynamic token');
    sources.authType = computedSource('provided by caller');
    if (proxy) {
        sources.proxy = computedSource('Config.getProxy()');
    }
    // Resolve generation config from settings and modelProvider
    const generationConfig = resolveGenerationConfig(settings?.generationConfig, modelProvider?.generationConfig, AuthType.AETHER_OAUTH, resolvedModel, sources);
    const config = {
        authType: AuthType.AETHER_OAUTH,
        model: resolvedModel,
        apiKey: 'AETHER_OAUTH_DYNAMIC_TOKEN',
        proxy,
        ...generationConfig
    };
    return { config, sources, warnings };
}
/**
 * Resolve generation config fields (samplingParams, timeout, etc.)
 */
function resolveGenerationConfig(settingsConfig, modelProviderConfig, authType, modelId, sources) {
    const result = {};
    for (const field of MODEL_GENERATION_CONFIG_FIELDS) {
        // ModelProvider config takes priority over settings config
        if (authType && modelProviderConfig && field in modelProviderConfig) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result[field] = modelProviderConfig[field];
            sources[field] = modelProvidersSource(authType, modelId || '', `generationConfig.${field}`);
        }
        else if (settingsConfig && field in settingsConfig) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result[field] = settingsConfig[field];
            sources[field] = settingsSource(`model.generationConfig.${field}`);
        }
    }
    return result;
}
//# sourceMappingURL=modelConfigResolver.js.map