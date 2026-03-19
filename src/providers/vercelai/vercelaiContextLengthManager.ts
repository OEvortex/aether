import {
    DEFAULT_CONTEXT_LENGTH,
    DEFAULT_MAX_OUTPUT_TOKENS,
    type ResolveTokenLimitsOptions,
    resolveGlobalTokenLimits
} from '../../utils/globalContextLengthManager';

export interface VercelAiModelMetadata {
    context_window?: unknown;
    max_tokens?: unknown;
}

function toPositiveInteger(value: unknown): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0
        ? Math.floor(parsed)
        : undefined;
}

function resolveAdvertisedTokenLimits(
    model: VercelAiModelMetadata,
    fallbackContextLength: number
): { maxInputTokens: number; maxOutputTokens: number } | undefined {
    const contextLength =
        toPositiveInteger(model.context_window) ?? fallbackContextLength;
    const maxOutputTokens = toPositiveInteger(model.max_tokens);

    if (!maxOutputTokens || contextLength <= maxOutputTokens) {
        return undefined;
    }

    return {
        maxInputTokens: contextLength - maxOutputTokens,
        maxOutputTokens
    };
}

export function resolveVercelAiTokenLimits(
    modelId: string,
    model: VercelAiModelMetadata,
    options?: Partial<ResolveTokenLimitsOptions>
): { maxInputTokens: number; maxOutputTokens: number } {
    const defaultContextLength =
        options?.defaultContextLength ?? DEFAULT_CONTEXT_LENGTH;
    const defaultMaxOutputTokens =
        options?.defaultMaxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
    const contextLength =
        toPositiveInteger(model.context_window) ?? defaultContextLength;

    const advertisedLimits = resolveAdvertisedTokenLimits(model, contextLength);
    if (advertisedLimits) {
        return advertisedLimits;
    }

    return resolveGlobalTokenLimits(modelId, contextLength, {
        defaultContextLength,
        defaultMaxOutputTokens,
        minReservedInputTokens: options?.minReservedInputTokens
    });
}
