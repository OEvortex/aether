import { describe, expect, it } from 'vitest';

import {
    FIXED_128K_MAX_INPUT_TOKENS,
    FIXED_128K_MAX_OUTPUT_TOKENS,
    resolveAdvertisedTokenLimits
} from './globalContextLengthManager';

describe('resolveAdvertisedTokenLimits', () => {
    it('uses the repo default 128K split for unknown models', () => {
        const limits = resolveAdvertisedTokenLimits('custom-model', undefined, {
            defaultContextLength: 128 * 1024,
            defaultMaxOutputTokens: 16 * 1024
        });

        expect(limits).toEqual({
            maxInputTokens: FIXED_128K_MAX_INPUT_TOKENS,
            maxOutputTokens: FIXED_128K_MAX_OUTPUT_TOKENS
        });
    });

    it('respects advertised output-token limits while preserving total context', () => {
        const limits = resolveAdvertisedTokenLimits('gpt-4o', undefined, {
            defaultContextLength: 128 * 1024,
            defaultMaxOutputTokens: 16 * 1024,
            advertisedMaxOutputTokens: 8 * 1024
        });

        expect(limits).toEqual({
            maxInputTokens: 120 * 1024,
            maxOutputTokens: 8 * 1024
        });
    });
});
