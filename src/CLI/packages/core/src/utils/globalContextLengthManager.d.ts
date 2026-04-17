export interface ResolveTokenLimitsOptions {
    defaultContextLength: number;
    defaultMaxOutputTokens: number;
    minReservedInputTokens?: number;
}
/**
 * Default context length for providers (128K tokens)
 */
export declare const DEFAULT_CONTEXT_LENGTH: number;
/**
 * Default maximum output tokens for providers (16K tokens)
 */
export declare const DEFAULT_MAX_OUTPUT_TOKENS: number;
/**
 * Default context length for Zhipu provider (192K tokens)
 */
export declare const ZHIPU_DEFAULT_CONTEXT_LENGTH: number;
/**
 * Default maximum output tokens for Zhipu provider (16K tokens)
 */
export declare const ZHIPU_DEFAULT_MAX_OUTPUT_TOKENS: number;
export declare const FIXED_128K_MAX_INPUT_TOKENS: number;
export declare const FIXED_128K_MAX_OUTPUT_TOKENS: number;
export declare const GLM45_MAX_INPUT_TOKENS: number;
export declare const GLM45_MAX_OUTPUT_TOKENS: number;
export declare function isDevstralModel(modelId: string): boolean;
export declare function isDeepSeekModel(modelId: string): boolean;
export declare function isGemma3Model(modelId: string): boolean;
export declare function isGemma4Model(modelId: string): boolean;
export declare function isLlama32Model(modelId: string): boolean;
export declare function isGemini25Model(modelId: string): boolean;
export declare function isGemini2Model(modelId: string): boolean;
export declare function isGemini3Model(modelId: string): boolean;
export declare function isGeminiModel(modelId: string): boolean;
export declare function isGlm45Model(modelId: string): boolean;
export declare function isGlmModel(modelId: string): boolean;
export declare function isGpt41Model(modelId: string): boolean;
export declare function isGpt4oModel(modelId: string): boolean;
export declare function isGpt5Model(modelId: string): boolean;
export declare function isGptModel(modelId: string): boolean;
export declare function isQwen35Model(modelId: string): boolean;
export declare function isNemotron3Model(modelId: string): boolean;
export declare function isNova2Model(modelId: string): boolean;
export declare function isQwen35OneMillionContextModel(modelId: string): boolean;
export declare function isQwen36OneMillionContextModel(modelId: string): boolean;
export declare function isClaudeModel(modelId: string): boolean;
export declare function isKimiK25Model(modelId: string): boolean;
export declare function isKimiModel(modelId: string): boolean;
export declare function isMinimaxModel(modelId: string): boolean;
export declare function isClaudeOpus46Model(modelId: string): boolean;
export declare function isVisionGptModel(modelId: string): boolean;
export declare function isMingFlashOmniModel(modelId: string): boolean;
export declare function isMiMoV2ProModel(modelId: string): boolean;
export declare function isMiMoV2OmniModel(modelId: string): boolean;
export declare function getDefaultMaxOutputTokensForContext(contextLength: number, defaultMaxOutputTokens: number): number;
export declare function resolveGlobalTokenLimits(modelId: string, contextLength: number, options: ResolveTokenLimitsOptions): {
    maxInputTokens: number;
    maxOutputTokens: number;
};
export declare function resolveAdvertisedTokenLimits(modelId: string, advertisedContextLength: number | undefined, options: ResolveTokenLimitsOptions & {
    advertisedMaxOutputTokens?: number;
}): {
    maxInputTokens: number;
    maxOutputTokens: number;
};
export interface ResolveCapabilitiesOptions {
    detectedToolCalling?: boolean;
    detectedImageInput?: boolean;
}
export declare function resolveGlobalCapabilities(modelId: string, options?: ResolveCapabilitiesOptions): {
    toolCalling: boolean;
    imageInput: boolean;
};
/** Robust normalizer: strips provider prefixes, pipes/colons, date/version suffixes, etc. */
export declare function normalize(model: string): string;
/**
 * Check if a model has an explicitly defined output token limit.
 * This distinguishes between models with known limits and unknown models that would fallback to default.
 */
export declare function hasExplicitOutputLimit(modelId: string): boolean;
