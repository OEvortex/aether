/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import type { HookConfig, HookExecutionResult, HookInput } from './types.js';
import { HookEventName } from './types.js';
/**
 * Hook runner that executes command hooks
 */
export declare class HookRunner {
    /**
     * Execute a single hook
     * @param hookConfig Hook configuration
     * @param eventName Event name
     * @param input Hook input
     * @param signal Optional AbortSignal to cancel hook execution
     */
    executeHook(hookConfig: HookConfig, eventName: HookEventName, input: HookInput, signal?: AbortSignal): Promise<HookExecutionResult>;
    /**
     * Execute multiple hooks in parallel
     * @param signal Optional AbortSignal to cancel hook execution
     */
    executeHooksParallel(hookConfigs: HookConfig[], eventName: HookEventName, input: HookInput, onHookStart?: (config: HookConfig, index: number) => void, onHookEnd?: (config: HookConfig, result: HookExecutionResult) => void, signal?: AbortSignal): Promise<HookExecutionResult[]>;
    /**
     * Execute multiple hooks sequentially
     * @param signal Optional AbortSignal to cancel hook execution
     */
    executeHooksSequential(hookConfigs: HookConfig[], eventName: HookEventName, input: HookInput, onHookStart?: (config: HookConfig, index: number) => void, onHookEnd?: (config: HookConfig, result: HookExecutionResult) => void, signal?: AbortSignal): Promise<HookExecutionResult[]>;
    /**
     * Apply hook output to modify input for the next hook in sequential execution
     */
    private applyHookOutputToInput;
    /**
     * Execute a command hook
     * @param hookConfig Hook configuration
     * @param eventName Event name
     * @param input Hook input
     * @param startTime Start time for duration calculation
     * @param signal Optional AbortSignal to cancel hook execution
     */
    private executeCommandHook;
    /**
     * Expand command with environment variables and input context
     */
    private expandCommand;
    /**
     * Convert plain text output to structured HookOutput
     */
    private convertPlainTextToHookOutput;
}
