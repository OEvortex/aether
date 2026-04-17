/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
export interface SubagentGeneratedContent {
    name: string;
    description: string;
    systemPrompt: string;
}
/**
 * Generates subagent configuration content using LLM.
 *
 * @param userDescription - The user's description of what the subagent should do
 * @param geminiClient - Initialized GeminiClient instance
 * @param abortSignal - AbortSignal for cancelling the request
 * @returns Promise resolving to generated subagent content
 */
export declare function subagentGenerator(userDescription: string, config: Config, abortSignal: AbortSignal): Promise<SubagentGeneratedContent>;
