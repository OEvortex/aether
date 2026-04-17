/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import type { CountTokensParameters } from '@google/genai';
import type { TokenCalculationResult } from './types.js';
/**
 * Simple request token estimator that handles text and image content serially
 */
export declare class RequestTokenizer {
    private textTokenizer;
    private imageTokenizer;
    constructor();
    /**
     * Calculate tokens for a request using serial processing
     */
    calculateTokens(request: CountTokensParameters): Promise<TokenCalculationResult>;
    /**
     * Calculate tokens for text contents
     */
    private calculateTextTokens;
    /**
     * Calculate tokens for image contents using serial processing
     */
    private calculateImageTokens;
    /**
     * Calculate tokens for audio contents
     * TODO: Implement proper audio token calculation
     */
    private calculateAudioTokens;
    /**
     * Calculate tokens for other content types (functions, files, etc.)
     */
    private calculateOtherTokens;
    /**
     * Fallback token calculation using simple string serialization
     */
    private calculateFallbackTokens;
    /**
     * Process request contents and group by type
     */
    private processAndGroupContents;
    /**
     * Process a single content item and add to appropriate arrays
     */
    private processContent;
    /**
     * Process a single part and add to appropriate arrays
     */
    private processPart;
}
