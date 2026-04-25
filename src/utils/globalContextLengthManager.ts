export interface ResolveTokenLimitsOptions {
    defaultContextLength: number;
    defaultMaxOutputTokens: number;
    minReservedInputTokens?: number;
}

const TOKENS_PER_KIBI = 1024;
const TOKENS_PER_MEBI = TOKENS_PER_KIBI * TOKENS_PER_KIBI;

export const DEFAULT_CONTEXT_LENGTH = 128 * 1024;
export const DEFAULT_MAX_OUTPUT_TOKENS = 16 * 1024;

export const ZHIPU_DEFAULT_CONTEXT_LENGTH = 192 * 1024;
export const ZHIPU_DEFAULT_MAX_OUTPUT_TOKENS = 16 * 1024;

const DEFAULT_MIN_RESERVED_INPUT_TOKENS = 1024;

const CLAUDE_TOTAL_TOKENS = 200 * TOKENS_PER_KIBI;
const CLAUDE_MAX_INPUT_TOKENS = CLAUDE_TOTAL_TOKENS - 32 * TOKENS_PER_KIBI;
const CLAUDE_MAX_OUTPUT_TOKENS = 32 * TOKENS_PER_KIBI;

const DEVSTRAL_MAX_INPUT_TOKENS = 256 * TOKENS_PER_KIBI - 32 * TOKENS_PER_KIBI;
const DEVSTRAL_MAX_OUTPUT_TOKENS = 32 * TOKENS_PER_KIBI;

const DEEPSEEK_TOTAL_TOKENS = 160 * TOKENS_PER_KIBI;
const DEEPSEEK_MAX_OUTPUT_TOKENS = 16 * TOKENS_PER_KIBI;
const DEEPSEEK_MAX_INPUT_TOKENS =
    DEEPSEEK_TOTAL_TOKENS - DEEPSEEK_MAX_OUTPUT_TOKENS;

const DEEPSEEK_V4_TOTAL_TOKENS = 1000 * 1024;
const DEEPSEEK_V4_MAX_OUTPUT_TOKENS = 64 * 1024;
const DEEPSEEK_V4_MAX_INPUT_TOKENS =
    DEEPSEEK_V4_TOTAL_TOKENS - DEEPSEEK_V4_MAX_OUTPUT_TOKENS;

export const FIXED_128K_MAX_INPUT_TOKENS =
    128 * TOKENS_PER_KIBI - 16 * TOKENS_PER_KIBI;
export const FIXED_128K_MAX_OUTPUT_TOKENS = 16 * TOKENS_PER_KIBI;

export const GLM45_MAX_INPUT_TOKENS =
    128 * TOKENS_PER_KIBI - 32 * TOKENS_PER_KIBI;
export const GLM45_MAX_OUTPUT_TOKENS = 32 * TOKENS_PER_KIBI;

const FIXED_256K_MAX_INPUT_TOKENS =
    256 * TOKENS_PER_KIBI - 32 * TOKENS_PER_KIBI;
const FIXED_256K_MAX_OUTPUT_TOKENS = 32 * TOKENS_PER_KIBI;

const GLM5_TOTAL_TOKENS = 200 * TOKENS_PER_KIBI;
const GLM5_MAX_OUTPUT_TOKENS = 64 * TOKENS_PER_KIBI;
const GLM5_MAX_INPUT_TOKENS =
    GLM5_TOTAL_TOKENS - GLM5_MAX_OUTPUT_TOKENS;

const MINIMAX_TOTAL_TOKENS = 200 * TOKENS_PER_KIBI;
const MINIMAX_MAX_INPUT_TOKENS = MINIMAX_TOTAL_TOKENS - 32 * TOKENS_PER_KIBI;
const MINIMAX_MAX_OUTPUT_TOKENS = 32 * TOKENS_PER_KIBI;

const FIXED_64K_TOTAL_TOKENS = 64 * TOKENS_PER_KIBI;
const FIXED_64K_MAX_OUTPUT_TOKENS = 8 * TOKENS_PER_KIBI;
const FIXED_64K_MAX_INPUT_TOKENS =
    FIXED_64K_TOTAL_TOKENS - FIXED_64K_MAX_OUTPUT_TOKENS;

const GEMA3_TOTAL_TOKENS = 128 * TOKENS_PER_KIBI;
const GEMA3_MAX_OUTPUT_TOKENS = 16 * TOKENS_PER_KIBI;
const GEMA3_MAX_INPUT_TOKENS = GEMA3_TOTAL_TOKENS - GEMA3_MAX_OUTPUT_TOKENS;

const GEMA4_MAX_INPUT_TOKENS = 256 * TOKENS_PER_KIBI - 32 * TOKENS_PER_KIBI;
const GEMA4_MAX_OUTPUT_TOKENS = 32 * TOKENS_PER_KIBI;

const QWEN35_MAX_INPUT_TOKENS = 256 * TOKENS_PER_KIBI - 32 * TOKENS_PER_KIBI;
const QWEN35_MAX_OUTPUT_TOKENS = 32 * TOKENS_PER_KIBI;

const NEMOTRON3_MAX_INPUT_TOKENS = 256 * TOKENS_PER_KIBI - 32 * TOKENS_PER_KIBI;
const NEMOTRON3_MAX_OUTPUT_TOKENS = 32 * TOKENS_PER_KIBI;

const QWEN35_1M_TOTAL_TOKENS = TOKENS_PER_MEBI;
const QWEN35_1M_MAX_OUTPUT_TOKENS = 32 * TOKENS_PER_KIBI;
const QWEN35_1M_MAX_INPUT_TOKENS =
    QWEN35_1M_TOTAL_TOKENS - QWEN35_1M_MAX_OUTPUT_TOKENS;

const QWEN36_1M_TOTAL_TOKENS = TOKENS_PER_MEBI;
const QWEN36_1M_MAX_OUTPUT_TOKENS = 32 * TOKENS_PER_KIBI;
const QWEN36_1M_MAX_INPUT_TOKENS =
    QWEN36_1M_TOTAL_TOKENS - QWEN36_1M_MAX_OUTPUT_TOKENS;

const GEMINI_1M_TOTAL_TOKENS = TOKENS_PER_MEBI;
const GEMINI25_MAX_OUTPUT_TOKENS = 32 * TOKENS_PER_KIBI;
const GEMINI25_MAX_INPUT_TOKENS =
    GEMINI_1M_TOTAL_TOKENS - GEMINI25_MAX_OUTPUT_TOKENS;

const GEMINI2_MAX_OUTPUT_TOKENS = 32 * TOKENS_PER_KIBI;
const GEMINI2_MAX_INPUT_TOKENS =
    GEMINI_1M_TOTAL_TOKENS - GEMINI2_MAX_OUTPUT_TOKENS;

const GEMINI3_MAX_OUTPUT_TOKENS = 64 * TOKENS_PER_KIBI;
const GEMINI3_MAX_INPUT_TOKENS =
    GEMINI_1M_TOTAL_TOKENS - GEMINI3_MAX_OUTPUT_TOKENS;

const NOVA2_MAX_OUTPUT_TOKENS = 64 * TOKENS_PER_KIBI;
const NOVA2_MAX_INPUT_TOKENS = TOKENS_PER_MEBI - NOVA2_MAX_OUTPUT_TOKENS;

const GPT5_MAX_INPUT_TOKENS = 400 * TOKENS_PER_KIBI - 64 * TOKENS_PER_KIBI;
const GPT5_MAX_OUTPUT_TOKENS = 64 * TOKENS_PER_KIBI;

const GPT4_1_TOTAL_TOKENS = TOKENS_PER_MEBI;
const GPT4_1_MAX_OUTPUT_TOKENS = 32 * TOKENS_PER_KIBI;
const GPT4_1_MAX_INPUT_TOKENS = GPT4_1_TOTAL_TOKENS - GPT4_1_MAX_OUTPUT_TOKENS;

const MIMOV2_PRO_TOTAL_TOKENS = TOKENS_PER_MEBI;
const MIMOV2_PRO_MAX_OUTPUT_TOKENS = 64 * TOKENS_PER_KIBI;
const MIMOV2_PRO_MAX_INPUT_TOKENS =
    MIMOV2_PRO_TOTAL_TOKENS - MIMOV2_PRO_MAX_OUTPUT_TOKENS;

const MIMOV2_OMNI_MAX_INPUT_TOKENS =
    256 * TOKENS_PER_KIBI - 32 * TOKENS_PER_KIBI;
const MIMOV2_OMNI_MAX_OUTPUT_TOKENS = 32 * TOKENS_PER_KIBI;

const MIMOV25_TOTAL_TOKENS = 256 * TOKENS_PER_KIBI;
const MIMOV25_MAX_OUTPUT_TOKENS = 32 * TOKENS_PER_KIBI;
const MIMOV25_MAX_INPUT_TOKENS =
    MIMOV25_TOTAL_TOKENS - MIMOV25_MAX_OUTPUT_TOKENS;

const MIMOV25_PRO_TOTAL_TOKENS = TOKENS_PER_MEBI;
const MIMOV25_PRO_MAX_OUTPUT_TOKENS = 64 * TOKENS_PER_KIBI;
const MIMOV25_PRO_MAX_INPUT_TOKENS =
    MIMOV25_PRO_TOTAL_TOKENS - MIMOV25_PRO_MAX_OUTPUT_TOKENS;

const KIMI_K25_TOTAL_TOKENS = 256 * TOKENS_PER_KIBI;
const KIMI_K25_MAX_OUTPUT_TOKENS = 32 * TOKENS_PER_KIBI;
const KIMI_K25_MAX_INPUT_TOKENS =
    KIMI_K25_TOTAL_TOKENS - KIMI_K25_MAX_OUTPUT_TOKENS;

const QWEN_PLUS_TOTAL_TOKENS = 256 * TOKENS_PER_KIBI;
const QWEN_PLUS_MAX_OUTPUT_TOKENS = 32 * TOKENS_PER_KIBI;
const HIGH_CONTEXT_THRESHOLD = 200 * TOKENS_PER_KIBI;
const HIGH_CONTEXT_MAX_OUTPUT_TOKENS = 32 * TOKENS_PER_KIBI;

export function isDevstralModel(modelId: string): boolean {
    return /devstral[-_]?2/i.test(modelId);
}

export function isDeepSeekModel(modelId: string): boolean {
    return /deepseek[-_]?/i.test(modelId);
}

export function isDeepSeekV4Model(modelId: string): boolean {
    return /deepseek[-_]?v4/i.test(modelId);
}

export function isGemma3Model(modelId: string): boolean {
    return /gemma[-_]?3(?!\.|-)4/i.test(modelId);
}

export function isGemma4Model(modelId: string): boolean {
    return /gemma[-_]?4/i.test(modelId);
}

export function isLlama32Model(modelId: string): boolean {
    return /llama[-_]?3[-_]?2/i.test(modelId);
}

export function isGemini25Model(modelId: string): boolean {
    return /gemini[-_]?2(?:\.|-)5/i.test(modelId);
}

export function isGemini2Model(modelId: string): boolean {
    return /gemini[-_]?2(?!\.|-?5)/i.test(modelId);
}

export function isGemini3Model(modelId: string): boolean {
    return /gemini[-_]?3(?:\.[-_]?1)?/i.test(modelId);
}

export function isGeminiModel(modelId: string): boolean {
    return /gemini[-_]?\d/i.test(modelId);
}

export function isGlm45Model(modelId: string): boolean {
    return /glm-4\.5(?!\d)/i.test(modelId);
}

export function isGlmModel(modelId: string): boolean {
    return /glm-(?:5(?:\.1)?|4\.(?:6|7))(?!\d)/i.test(modelId);
}

export function isGpt41Model(modelId: string): boolean {
    return /gpt-4-1/i.test(modelId);
}

export function isGpt4oModel(modelId: string): boolean {
    return /gpt-4o/i.test(modelId);
}

export function isGpt5Model(modelId: string): boolean {
    return /gpt-5/i.test(modelId);
}

const HY3_TOTAL_TOKENS = 256 * TOKENS_PER_KIBI;
const HY3_MAX_OUTPUT_TOKENS = 32 * TOKENS_PER_KIBI;
const HY3_MAX_INPUT_TOKENS = HY3_TOTAL_TOKENS - HY3_MAX_OUTPUT_TOKENS;

export function isHy3Model(modelId: string): boolean {
    return /hy3/i.test(modelId);
}


export function isQwen35Model(modelId: string): boolean {
    return /qwen3\.5/i.test(modelId);
}

export function isNemotron3Model(modelId: string): boolean {
    return /nemotron[-_]?3/i.test(modelId);
}

export function isNova2Model(modelId: string): boolean {
    return /nova[-_]?2/i.test(modelId);
}

export function isQwen35OneMillionContextModel(modelId: string): boolean {
    return /qwen[-_]?3(?:\.|[-_])?5[-_]?(?:flash|plus)/i.test(modelId);
}

export function isQwen36OneMillionContextModel(modelId: string): boolean {
    return /qwen[-_]?3(?:\.|[-_])?6/i.test(modelId);
}

export function isClaudeModel(modelId: string): boolean {
    return /claude[-_]?/i.test(modelId);
}

export function isKimiK25Model(modelId: string): boolean {
    return /kimi[-_/]?k2(?:[._-]?(?:5|6))/i.test(modelId);
}

export function isKimiModel(modelId: string): boolean {
    return /kimi[-_]?k2/i.test(modelId);
}

export function isMinimaxModel(modelId: string): boolean {
    return /minimax[-_]?m2/i.test(modelId);
}

export function isClaudeOpus46Model(modelId: string): boolean {
    return /claude[-_]?opus[-_]?4(?:\.|-)6/i.test(modelId);
}

export function isVisionGptModel(modelId: string): boolean {
    return /gpt/i.test(modelId) && !/gpt-oss/i.test(modelId);
}

export function isMingFlashOmniModel(modelId: string): boolean {
    return (
        /ming[-_]?flash[-_]?omni[-_]?2(?:\.|-)0/i.test(modelId) ||
        /ming-flash-omni-2-0/i.test(modelId)
    );
}

export function isMiMoV2ProModel(modelId: string): boolean {
    return /mimo[-_]?v2[-_]?pro/i.test(modelId);
}

export function isMiMoV25Model(modelId: string): boolean {
    return /mimo[-_]?v2(?:\.|-)?5/i.test(modelId) && !/pro/i.test(modelId);
}

export function isMiMoV25ProModel(modelId: string): boolean {
    return /mimo[-_]?v2(?:\.|-)?5[-_]?pro/i.test(modelId);
}

export function isMiMoV2OmniModel(modelId: string): boolean {
    return /mimo[-_]?v2[-_]?omni/i.test(modelId);
}

export function getDefaultMaxOutputTokensForContext(
    contextLength: number,
    defaultMaxOutputTokens: number
): number {
    return contextLength >= HIGH_CONTEXT_THRESHOLD
        ? HIGH_CONTEXT_MAX_OUTPUT_TOKENS
        : defaultMaxOutputTokens;
}

export function resolveGlobalTokenLimits(
    modelId: string,
    contextLength: number,
    options: ResolveTokenLimitsOptions
): { maxInputTokens: number; maxOutputTokens: number } {
    if (isDeepSeekV4Model(modelId)) {
        return {
            maxInputTokens: DEEPSEEK_V4_MAX_INPUT_TOKENS,
            maxOutputTokens: DEEPSEEK_V4_MAX_OUTPUT_TOKENS
        };
    }
    if (isDeepSeekModel(modelId)) {
        return {
            maxInputTokens: DEEPSEEK_MAX_INPUT_TOKENS,
            maxOutputTokens: DEEPSEEK_MAX_OUTPUT_TOKENS
        };
    }
    if (isDevstralModel(modelId)) {
        return {
            maxInputTokens: DEVSTRAL_MAX_INPUT_TOKENS,
            maxOutputTokens: DEVSTRAL_MAX_OUTPUT_TOKENS
        };
    }
    if (isGemma3Model(modelId)) {
        return {
            maxInputTokens: GEMA3_MAX_INPUT_TOKENS,
            maxOutputTokens: GEMA3_MAX_OUTPUT_TOKENS
        };
    }
    if (isGemma4Model(modelId)) {
        return {
            maxInputTokens: GEMA4_MAX_INPUT_TOKENS,
            maxOutputTokens: GEMA4_MAX_OUTPUT_TOKENS
        };
    }
    if (isLlama32Model(modelId)) {
        return {
            maxInputTokens: FIXED_128K_MAX_INPUT_TOKENS,
            maxOutputTokens: FIXED_128K_MAX_OUTPUT_TOKENS
        };
    }
    if (isQwen35OneMillionContextModel(modelId)) {
        return {
            maxInputTokens: QWEN35_1M_MAX_INPUT_TOKENS,
            maxOutputTokens: QWEN35_1M_MAX_OUTPUT_TOKENS
        };
    }
    if (isQwen36OneMillionContextModel(modelId)) {
        return {
            maxInputTokens: QWEN36_1M_MAX_INPUT_TOKENS,
            maxOutputTokens: QWEN36_1M_MAX_OUTPUT_TOKENS
        };
    }
    if (isGemini2Model(modelId)) {
        return {
            maxInputTokens: GEMINI2_MAX_INPUT_TOKENS,
            maxOutputTokens: GEMINI2_MAX_OUTPUT_TOKENS
        };
    }
    if (isGemini25Model(modelId)) {
        return {
            maxInputTokens: GEMINI25_MAX_INPUT_TOKENS,
            maxOutputTokens: GEMINI25_MAX_OUTPUT_TOKENS
        };
    }
    if (isGemini3Model(modelId)) {
        return {
            maxInputTokens: GEMINI3_MAX_INPUT_TOKENS,
            maxOutputTokens: GEMINI3_MAX_OUTPUT_TOKENS
        };
    }
    if (isGlmModel(modelId)) {
        return {
            maxInputTokens: GLM5_MAX_INPUT_TOKENS,
            maxOutputTokens: GLM5_MAX_OUTPUT_TOKENS
        };
    }
    if (isGlm45Model(modelId)) {
        return {
            maxInputTokens: GLM45_MAX_INPUT_TOKENS,
            maxOutputTokens: GLM45_MAX_OUTPUT_TOKENS
        };
    }
    if (isGpt41Model(modelId)) {
        return {
            maxInputTokens: GPT4_1_MAX_INPUT_TOKENS,
            maxOutputTokens: GPT4_1_MAX_OUTPUT_TOKENS
        };
    }
    if (isGpt4oModel(modelId)) {
        return {
            maxInputTokens: FIXED_128K_MAX_INPUT_TOKENS,
            maxOutputTokens: FIXED_128K_MAX_OUTPUT_TOKENS
        };
    }
    if (isGpt5Model(modelId)) {
        return {
            maxInputTokens: GPT5_MAX_INPUT_TOKENS,
            maxOutputTokens: GPT5_MAX_OUTPUT_TOKENS
        };
    }
    if (isMingFlashOmniModel(modelId)) {
        return {
            maxInputTokens: FIXED_64K_MAX_INPUT_TOKENS,
            maxOutputTokens: FIXED_64K_MAX_OUTPUT_TOKENS
        };
    }
    if (isMiMoV2ProModel(modelId)) {
        return {
            maxInputTokens: MIMOV2_PRO_MAX_INPUT_TOKENS,
            maxOutputTokens: MIMOV2_PRO_MAX_OUTPUT_TOKENS
        };
    }
    if (isMiMoV25Model(modelId)) {
        return {
            maxInputTokens: MIMOV25_MAX_INPUT_TOKENS,
            maxOutputTokens: MIMOV25_MAX_OUTPUT_TOKENS
        };
    }
    if (isMiMoV25ProModel(modelId)) {
        return {
            maxInputTokens: MIMOV25_PRO_MAX_INPUT_TOKENS,
            maxOutputTokens: MIMOV25_PRO_MAX_OUTPUT_TOKENS
        };
    }
    if (isMiMoV2OmniModel(modelId)) {
        return {
            maxInputTokens: MIMOV2_OMNI_MAX_INPUT_TOKENS,
            maxOutputTokens: MIMOV2_OMNI_MAX_OUTPUT_TOKENS
        };
    }
    if (isMinimaxModel(modelId)) {
        return {
            maxInputTokens: MINIMAX_MAX_INPUT_TOKENS,
            maxOutputTokens: MINIMAX_MAX_OUTPUT_TOKENS
        };
    }
    if (isClaudeModel(modelId)) {
        return {
            maxInputTokens: CLAUDE_MAX_INPUT_TOKENS,
            maxOutputTokens: CLAUDE_MAX_OUTPUT_TOKENS
        };
    }
    if (isKimiModel(modelId)) {
        return {
            maxInputTokens: FIXED_256K_MAX_INPUT_TOKENS,
            maxOutputTokens: FIXED_256K_MAX_OUTPUT_TOKENS
        };
    }
    if (isKimiK25Model(modelId)) {
        return {
            maxInputTokens: KIMI_K25_MAX_INPUT_TOKENS,
            maxOutputTokens: KIMI_K25_MAX_OUTPUT_TOKENS
        };
    }
    if (isQwen35Model(modelId)) {
        return {
            maxInputTokens: QWEN35_MAX_INPUT_TOKENS,
            maxOutputTokens: QWEN35_MAX_OUTPUT_TOKENS
        };
    }
    if (isNemotron3Model(modelId)) {
        return {
            maxInputTokens: NEMOTRON3_MAX_INPUT_TOKENS,
            maxOutputTokens: NEMOTRON3_MAX_OUTPUT_TOKENS
        };
    }
    if (isNova2Model(modelId)) {
        return {
            maxInputTokens: NOVA2_MAX_INPUT_TOKENS,
            maxOutputTokens: NOVA2_MAX_OUTPUT_TOKENS
        };
    }

    if (isHy3Model(modelId)) {
        return {
            maxInputTokens: HY3_MAX_INPUT_TOKENS,
            maxOutputTokens: HY3_MAX_OUTPUT_TOKENS
        };
    }
    if (isClaudeOpus46Model(modelId)) {
        return {
            maxInputTokens: TOKENS_PER_MEBI - 64 * TOKENS_PER_KIBI,
            maxOutputTokens: 64 * TOKENS_PER_KIBI
        };
    }

    const minReservedInputTokens =
        typeof options.minReservedInputTokens === 'number' &&
        options.minReservedInputTokens > 0
            ? options.minReservedInputTokens
            : DEFAULT_MIN_RESERVED_INPUT_TOKENS;

    const safeContextLength =
        typeof contextLength === 'number' &&
        contextLength > minReservedInputTokens
            ? contextLength
            : options.defaultContextLength;

    let maxOutput = getDefaultMaxOutputTokensForContext(
        safeContextLength,
        options.defaultMaxOutputTokens
    );
    maxOutput = Math.floor(
        Math.max(
            1,
            Math.min(maxOutput, safeContextLength - minReservedInputTokens)
        )
    );

    return {
        maxInputTokens: Math.max(1, safeContextLength - maxOutput),
        maxOutputTokens: maxOutput
    };
}

export function resolveAdvertisedTokenLimits(
    modelId: string,
    advertisedContextLength: number | undefined,
    options: ResolveTokenLimitsOptions & {
        advertisedMaxOutputTokens?: number;
    }
): { maxInputTokens: number; maxOutputTokens: number } {
    const resolvedLimits = resolveGlobalTokenLimits(
        modelId,
        advertisedContextLength ?? options.defaultContextLength,
        options
    );

    const advertisedMaxOutputTokens =
        typeof options.advertisedMaxOutputTokens === 'number' &&
        Number.isFinite(options.advertisedMaxOutputTokens) &&
        options.advertisedMaxOutputTokens > 0
            ? Math.floor(options.advertisedMaxOutputTokens)
            : undefined;

    if (advertisedMaxOutputTokens === undefined) {
        return resolvedLimits;
    }

    const totalContextTokens =
        resolvedLimits.maxInputTokens + resolvedLimits.maxOutputTokens;
    const boundedMaxOutputTokens = Math.min(
        advertisedMaxOutputTokens,
        Math.max(1, totalContextTokens - 1)
    );

    return {
        maxInputTokens: Math.max(
            1,
            totalContextTokens - boundedMaxOutputTokens
        ),
        maxOutputTokens: boundedMaxOutputTokens
    };
}

export interface ResolveCapabilitiesOptions {
    detectedToolCalling?: boolean;
    detectedImageInput?: boolean;
}

export function resolveGlobalCapabilities(
    modelId: string,
    options?: ResolveCapabilitiesOptions
): { toolCalling: boolean; imageInput: boolean } {
    const detectedImageInput = options?.detectedImageInput === true;

    return {
        toolCalling: true,
        imageInput:
            detectedImageInput ||
            isClaudeModel(modelId) ||
            isKimiK25Model(modelId) ||
            isVisionGptModel(modelId) ||
            isGeminiModel(modelId) ||
            isQwen35Model(modelId) ||
            isQwen35OneMillionContextModel(modelId) ||
            isQwen36OneMillionContextModel(modelId) ||
            isMiMoV25Model(modelId) ||
            isMiMoV25ProModel(modelId) ||
            isMiMoV2OmniModel(modelId) ||
            isGemma4Model(modelId)
    };
}
