/**
 * Pure data exports for provider configuration — no VS Code or extension runtime dependencies.
 * This file is safe to import from CLI and non-extension contexts.
 */
export interface ModelConfig {
    id: string;
    name: string;
    tooltip?: string;
    maxInputTokens?: number;
    maxOutputTokens?: number;
    version?: string;
    capabilities?: {
        toolCalling?: boolean;
        imageInput?: boolean;
    };
    tags?: string[];
    family?: string;
    baseUrl?: string;
    apiKey?: string;
    customHeader?: Record<string, string>;
    extraBody?: Record<string, unknown>;
    sdkMode?: 'openai' | 'anthropic' | 'oai-response';
    provider?: string;
    model?: string;
    outputThinking?: boolean;
    includeThinking?: boolean;
    thinkingBudget?: number;
}
export interface ProviderOverride {
    customHeader?: Record<string, string>;
    extraBody?: Record<string, unknown>;
    sdkMode?: 'openai' | 'anthropic' | 'oai-response';
}
export interface RateLimitConfig {
    requestsPerSecond: number;
    windowMs?: number;
}
export interface RateLimitSelection {
    default?: RateLimitConfig;
    openai?: RateLimitConfig;
    anthropic?: RateLimitConfig;
    responses?: RateLimitConfig;
}
export interface KnownProviderConfig extends Partial<ProviderOverride> {
    displayName: string;
    description?: string;
    settingsPrefix?: string;
    models?: ModelConfig[];
    apiKeyTemplate?: string;
    supportsApiKey?: boolean;
    defaultApiKey?: string;
    openModelEndpoint?: boolean;
    family?: string;
    fetchModels?: boolean;
    modelsEndpoint?: string;
    modelParser?: {
        arrayPath?: string;
        cooldownMinutes?: number;
        filterField?: string;
        filterValue?: string;
        idField?: string;
        nameField?: string;
        descriptionField?: string;
        contextLengthField?: string;
        tagsField?: string;
    };
    openai?: {
        baseUrl?: string;
        extraBody?: Record<string, unknown>;
        customHeader?: Record<string, string>;
    };
    anthropic?: {
        baseUrl?: string;
        extraBody?: Record<string, unknown>;
        customHeader?: Record<string, string>;
    };
    responses?: {
        baseUrl?: string;
        extraBody?: Record<string, unknown>;
        customHeader?: Record<string, string>;
    };
    rateLimit?: RateLimitSelection;
    sdkMode?: 'openai' | 'anthropic' | 'oai-response';
    baseUrl?: string;
}
export declare const KnownProviders: Record<string, KnownProviderConfig>;
