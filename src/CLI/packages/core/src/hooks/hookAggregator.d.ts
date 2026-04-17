/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import type { HookExecutionResult, HookOutput } from './types.js';
import { HookEventName } from './types.js';
/**
 * Aggregated result from multiple hook executions
 */
export interface AggregatedHookResult {
    success: boolean;
    allOutputs: HookOutput[];
    errors: Error[];
    totalDuration: number;
    finalOutput?: HookOutput;
}
/**
 * HookAggregator merges multiple hook outputs using event-specific rules.
 *
 * Different events have different merging strategies:
 * - PreToolUse/PostToolUse: OR logic for decisions, concatenation for messages
 */
export declare class HookAggregator {
    /**
     * Aggregate results from multiple hook executions
     */
    aggregateResults(results: HookExecutionResult[], eventName: HookEventName): AggregatedHookResult;
    /**
     * Merge multiple hook outputs based on event type
     */
    private mergeOutputs;
    /**
     * Merge outputs using OR logic for decisions and concatenation for messages.
     *
     * Rules:
     * - Any "block" or "deny" decision results in blocking (most restrictive wins)
     * - Reasons are concatenated with newlines
     * - continue=false takes precedence over continue=true
     * - Additional context is concatenated
     * - For PostToolUse, decision and reason are required fields
     */
    private mergeWithOrLogic;
    /**
     * Merge outputs for mergePermissionRequestOutputs events.
     *
     * Rules:
     * - behavior: deny wins over allow (security priority)
     * - message: concatenated with newlines
     * - updatedInput: later values win
     * - updatedPermissions: concatenated
     * - interrupt: true wins over false
     */
    private mergePermissionRequestOutputs;
    /**
     * Simple merge for events without special logic
     */
    private mergeSimple;
    /**
     * Create the appropriate specific hook output class based on event type
     */
    private createSpecificHookOutput;
    /**
     * Extract additional context from hook-specific outputs
     */
    private extractAdditionalContext;
}
