/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 *
 * Prompt Suggestion Generator
 *
 * Uses a lightweight LLM call to predict what the user would naturally
 * type next (Next-step Suggestion / NES).
 */
import type { Content } from '@google/genai';
import type { Config } from '../config/config.js';
/**
 * Prompt for suggestion generation.
 * Instructs the model to predict the user's next input.
 */
export declare const SUGGESTION_PROMPT = "[SUGGESTION MODE: Suggest what the user might naturally type next.]\n\nFIRST: Look at the user's recent messages and original request.\n\nYour job is to predict what THEY would type - not what you think they should do.\n\nTHE TEST: Would they think \"I was just about to type that\"?\n\nEXAMPLES:\nUser asked \"fix the bug and run tests\", bug is fixed \u2192 \"run the tests\"\nAfter code written \u2192 \"try it out\"\nModel offers options \u2192 suggest the one the user would likely pick, based on conversation\nModel asks to continue \u2192 \"yes\" or \"go ahead\"\nTask complete, obvious follow-up \u2192 \"commit this\" or \"push it\"\nAfter error or misunderstanding \u2192 silence (let them assess/correct)\n\nBe specific: \"run the tests\" beats \"continue\".\n\nNEVER SUGGEST:\n- Evaluative (\"looks good\", \"thanks\")\n- Questions (\"what about...?\")\n- AI-voice (\"Let me...\", \"I'll...\", \"Here's...\")\n- New ideas they didn't ask about\n- Multiple sentences\n\nStay silent if the next step isn't obvious from what the user said.\n\nFormat: 2-12 words, match the user's style. Or nothing.\n\nReply with ONLY the suggestion, no quotes or explanation.";
/**
 * Generate a prompt suggestion using an LLM call.
 *
 * @param config - App config (provides BaseLlmClient and model)
 * @param conversationHistory - Full conversation history as Content[]
 * @param abortSignal - Signal to cancel the LLM call (e.g., when user types)
 * @returns Object with suggestion text and optional filter reason, or null on error/early skip
 */
export declare function generatePromptSuggestion(config: Config, conversationHistory: Content[], abortSignal: AbortSignal, options?: {
    enableCacheSharing?: boolean;
    model?: string;
}): Promise<{
    suggestion: string | null;
    filterReason?: string;
}>;
/**
 * Returns the filter reason if the suggestion should be suppressed, or null if it passes.
 */
export declare function getFilterReason(suggestion: string): string | null;
/**
 * Returns true if the suggestion should be filtered out.
 * Convenience wrapper around getFilterReason for tests and simple checks.
 */
export declare function shouldFilterSuggestion(suggestion: string): boolean;
