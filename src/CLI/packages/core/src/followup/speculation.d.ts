/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 *
 * Speculation Engine
 *
 * Speculatively executes the accepted suggestion before the user confirms,
 * using a forked GeminiChat with copy-on-write file isolation.
 *
 * Flow:
 * 1. Suggestion shown → startSpeculation() fires
 * 2. Speculative loop runs in background (read-only tools + overlay writes)
 * 3. User presses Tab/Enter → acceptSpeculation() copies overlay to real FS
 * 4. User types → abortSpeculation() cleans up
 */
import type { Content } from '@google/genai';
import type { Config } from '../config/config.js';
import type { GeminiClient } from '../core/client.js';
import { OverlayFs } from './overlayFs.js';
export interface BoundaryInfo {
    type: string;
    detail: string;
    completedAt: number;
}
export interface SpeculationState {
    id: string;
    status: 'idle' | 'running' | 'completed' | 'boundary' | 'aborted';
    suggestion: string;
    overlayFs: OverlayFs | null;
    abortController: AbortController | null;
    messages: Content[];
    boundary?: BoundaryInfo;
    startTime: number;
    toolUseCount: number;
    pipelinedSuggestion?: string;
}
export interface SpeculationResult {
    filesApplied: string[];
    messages: Content[];
    boundary?: BoundaryInfo;
    timeSavedMs: number;
    nextSuggestion?: string;
}
export declare const IDLE_SPECULATION: Readonly<SpeculationState>;
/**
 * Start speculative execution of a suggestion.
 * Called when the suggestion is first shown to the user (before acceptance).
 */
export declare function startSpeculation(config: Config, suggestion: string, parentSignal?: AbortSignal, options?: {
    model?: string;
}): Promise<SpeculationState>;
/**
 * Accept speculation results: copy overlay files to real filesystem and
 * return messages to inject into the main conversation.
 */
export declare function acceptSpeculation(state: SpeculationState, geminiClient: GeminiClient): Promise<SpeculationResult>;
/**
 * Abort a running or completed speculation and clean up resources.
 */
export declare function abortSpeculation(state: SpeculationState): Promise<void>;
/**
 * Ensure all functionCall parts have matching functionResponse parts.
 * If the last model message has unpaired function calls (boundary truncation),
 * remove those function call parts to keep the history API-legal.
 */
export declare function ensureToolResultPairing(messages: Content[]): Content[];
