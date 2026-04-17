/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { getDefaultApiKeyEnvVar, getDefaultModelEnvVar, MissingAnthropicBaseUrlEnvError, MissingApiKeyError, MissingBaseUrlError, MissingModelError, StrictMissingCredentialsError, StrictMissingModelIdError } from '../models/modelConfigErrors.js';
import { PROVIDER_SOURCED_FIELDS } from '../models/modelsConfig.js';
import { LoggingContentGenerator } from './loggingContentGenerator/index.js';
export var AuthType;
(function (AuthType) {
    AuthType["USE_OPENAI"] = "openai";
    AuthType["AETHER_OAUTH"] = "aether-oauth";
    AuthType["USE_GEMINI"] = "gemini";
    AuthType["USE_VERTEX_AI"] = "vertex-ai";
    AuthType["USE_ANTHROPIC"] = "anthropic";
})(AuthType || (AuthType = {}));
function setSource(sources, path, source) {
    sources[path] = source;
}
function getSeedSource(seed, path) {
    return seed?.[path];
}
/**
 * Resolve ContentGeneratorConfig while tracking the source of each effective field.
 *
 * This function now primarily validates and finalizes the configuration that has
 * already been resolved by ModelConfigResolver. The env fallback logic has been
 * moved to the unified resolver to eliminate duplication.
 *
 * Note: The generationConfig passed here should already be fully resolved with
 * proper source tracking from the caller (CLI/SDK layer).
 */
export function resolveContentGeneratorConfigWithSources(config, authType, generationConfig, seedSources, options) {
    const sources = { ...(seedSources || {}) };
    const strictModelProvider = options?.strictModelProvider === true;
    // Build config with computed fields
    const newContentGeneratorConfig = {
        ...(generationConfig || {}),
        authType,
        proxy: config?.getProxy()
    };
    // Set sources for computed fields
    setSource(sources, 'authType', {
        kind: 'computed',
        detail: 'provided by caller'
    });
    if (config?.getProxy()) {
        setSource(sources, 'proxy', {
            kind: 'computed',
            detail: 'Config.getProxy()'
        });
    }
    // Preserve seed sources for fields that were passed in
    const seedOrUnknown = (path) => getSeedSource(seedSources, path) ?? { kind: 'unknown' };
    for (const field of PROVIDER_SOURCED_FIELDS) {
        if (generationConfig && field in generationConfig && !sources[field]) {
            setSource(sources, field, seedOrUnknown(field));
        }
    }
    // Validate required fields based on authType. This does not perform any
    // fallback resolution (resolution is handled by ModelConfigResolver).
    const validation = validateModelConfig(newContentGeneratorConfig, strictModelProvider);
    if (!validation.valid) {
        throw new Error(validation.errors.map((e) => e.message).join('\n'));
    }
    return {
        config: newContentGeneratorConfig,
        sources
    };
}
/**
 * Validate a resolved model configuration.
 * This is the single validation entry point used across Core.
 */
export function validateModelConfig(config, isStrictModelProvider = false) {
    const errors = [];
    // Aether OAuth doesn't need validation - it uses dynamic tokens
    if (config.authType === AuthType.AETHER_OAUTH) {
        return { valid: true, errors: [] };
    }
    // API key is required for all other auth types
    if (!config.apiKey) {
        if (isStrictModelProvider) {
            errors.push(new StrictMissingCredentialsError(config.authType, config.model, config.apiKeyEnvKey));
        }
        else {
            const envKey = config.apiKeyEnvKey || getDefaultApiKeyEnvVar(config.authType);
            errors.push(new MissingApiKeyError({
                authType: config.authType,
                model: config.model,
                baseUrl: config.baseUrl,
                envKey
            }));
        }
    }
    // Model is required
    if (!config.model) {
        if (isStrictModelProvider) {
            errors.push(new StrictMissingModelIdError(config.authType));
        }
        else {
            const envKey = getDefaultModelEnvVar(config.authType);
            errors.push(new MissingModelError({ authType: config.authType, envKey }));
        }
    }
    // Explicit baseUrl is required for Anthropic; Migrated from existing code.
    if (config.authType === AuthType.USE_ANTHROPIC && !config.baseUrl) {
        if (isStrictModelProvider) {
            errors.push(new MissingBaseUrlError({
                authType: config.authType,
                model: config.model
            }));
        }
        else if (config.authType === AuthType.USE_ANTHROPIC) {
            errors.push(new MissingAnthropicBaseUrlEnvError());
        }
    }
    return { valid: errors.length === 0, errors };
}
export function createContentGeneratorConfig(config, authType, generationConfig) {
    return resolveContentGeneratorConfigWithSources(config, authType, generationConfig).config;
}
export async function createContentGenerator(generatorConfig, config, isInitialAuth) {
    const validation = validateModelConfig(generatorConfig, false);
    if (!validation.valid) {
        throw new Error(validation.errors.map((e) => e.message).join('\n'));
    }
    const authType = generatorConfig.authType;
    if (!authType) {
        throw new Error('ContentGeneratorConfig must have an authType');
    }
    let baseGenerator;
    if (authType === AuthType.USE_OPENAI) {
        const { createOpenAIContentGenerator } = await import('./openaiContentGenerator/index.js');
        baseGenerator = createOpenAIContentGenerator(generatorConfig, config);
    }
    else if (authType === AuthType.AETHER_OAUTH) {
        const { getaetherOAuthClient: getAetherOauthClient } = await import('../qwen/aetherOAuth2.js');
        const { AetherContentGenerator } = await import('../qwen/aetherContentGenerator.js');
        try {
            const aetherClient = await getAetherOauthClient(config, isInitialAuth ? { requireCachedCredentials: true } : undefined);
            baseGenerator = new AetherContentGenerator(aetherClient, generatorConfig, config);
        }
        catch (error) {
            throw new Error(`${error instanceof Error ? error.message : String(error)}`);
        }
    }
    else if (authType === AuthType.USE_ANTHROPIC) {
        const { createAnthropicContentGenerator } = await import('./anthropicContentGenerator/index.js');
        baseGenerator = createAnthropicContentGenerator(generatorConfig, config);
    }
    else if (authType === AuthType.USE_GEMINI ||
        authType === AuthType.USE_VERTEX_AI) {
        const { createGeminiContentGenerator } = await import('./geminiContentGenerator/index.js');
        baseGenerator = createGeminiContentGenerator(generatorConfig, config);
    }
    else {
        throw new Error(`Error creating contentGenerator: Unsupported authType: ${authType}`);
    }
    return new LoggingContentGenerator(baseGenerator, config, generatorConfig);
}
//# sourceMappingURL=contentGenerator.js.map