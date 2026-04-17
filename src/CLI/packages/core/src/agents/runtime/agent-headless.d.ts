/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview AgentHeadless — one-shot task execution wrapper around AgentCore.
 *
 * AgentHeadless manages
 * the lifecycle of a single headless task: start → run → finish.
 * It delegates all model reasoning and tool scheduling to AgentCore.
 *
 * For persistent interactive agents, see AgentInteractive (Phase 2).
 */
import type { Config } from '../../config/config.js';
import { AgentCore } from './agent-core.js';
import type { AgentEventEmitter, AgentHooks } from './agent-events.js';
import type { AgentStatsSummary } from './agent-statistics.js';
import type { ModelConfig, PromptConfig, RunConfig, ToolConfig } from './agent-types.js';
import { AgentTerminateMode } from './agent-types.js';
/**
 * Manages the runtime context state for the subagent.
 * This class provides a mechanism to store and retrieve key-value pairs
 * that represent the dynamic state and variables accessible to the subagent
 * during its execution.
 */
export declare class ContextState {
    private state;
    /**
     * Retrieves a value from the context state.
     *
     * @param key - The key of the value to retrieve.
     * @returns The value associated with the key, or undefined if the key is not found.
     */
    get(key: string): unknown;
    /**
     * Sets a value in the context state.
     *
     * @param key - The key to set the value under.
     * @param value - The value to set.
     */
    set(key: string, value: unknown): void;
    /**
     * Retrieves all keys in the context state.
     *
     * @returns An array of all keys in the context state.
     */
    get_keys(): string[];
}
/**
 * Replaces `${...}` placeholders in a template string with values from a context.
 *
 * This function identifies all placeholders in the format `${key}`, validates that
 * each key exists in the provided `ContextState`, and then performs the substitution.
 *
 * @param template The template string containing placeholders.
 * @param context The `ContextState` object providing placeholder values.
 * @returns The populated string with all placeholders replaced.
 * @throws {Error} if any placeholder key is not found in the context.
 */
export declare function templateString(template: string, context: ContextState): string;
/**
 * AgentHeadless — one-shot task executor.
 *
 * Takes a task, runs it through AgentCore's reasoning loop, and returns
 * the result.
 *
 * Lifecycle: Born → execute() → die.
 */
export declare class AgentHeadless {
    private readonly core;
    private finalText;
    private terminateMode;
    private constructor();
    /**
     * Creates a new AgentHeadless instance.
     *
     * @param name - The name for the subagent, used for logging and identification.
     * @param runtimeContext - The shared runtime configuration and services.
     * @param promptConfig - Configuration for the subagent's prompt and behavior.
     * @param modelConfig - Configuration for the generative model parameters.
     * @param runConfig - Configuration for the subagent's execution environment.
     * @param toolConfig - Optional configuration for tools available to the subagent.
     * @param eventEmitter - Optional event emitter for streaming events to UI.
     * @param hooks - Optional lifecycle hooks.
     */
    static create(name: string, runtimeContext: Config, promptConfig: PromptConfig, modelConfig: ModelConfig, runConfig: RunConfig, toolConfig?: ToolConfig, eventEmitter?: AgentEventEmitter, hooks?: AgentHooks): Promise<AgentHeadless>;
    /**
     * Executes the task in headless mode.
     *
     * This method orchestrates the subagent's execution lifecycle:
     * 1. Creates a chat session
     * 2. Prepares tools
     * 3. Runs the reasoning loop until completion/termination
     * 4. Emits start/finish/error events
     * 5. Records telemetry
     *
     * @param context - The current context state containing variables for prompt templating.
     * @param externalSignal - Optional abort signal for external cancellation.
     */
    execute(context: ContextState, externalSignal?: AbortSignal): Promise<void>;
    /**
     * Provides access to the underlying AgentCore for advanced use cases.
     * Used by AgentInteractive and InProcessBackend.
     */
    getCore(): AgentCore;
    get executionStats(): import("./agent-core.js").ExecutionStats;
    set executionStats(value: import("./agent-core.js").ExecutionStats);
    getEventEmitter(): AgentEventEmitter | undefined;
    getStatistics(): {
        successRate: number;
        toolUsage: Array<{
            name: string;
            count: number;
            success: number;
            failure: number;
            lastError?: string;
            totalDurationMs?: number;
            averageDurationMs?: number;
        }>;
    } & import("./agent-core.js").ExecutionStats;
    getExecutionSummary(): AgentStatsSummary;
    getFinalText(): string;
    getTerminateMode(): AgentTerminateMode;
    get name(): string;
    get runtimeContext(): Config;
}
