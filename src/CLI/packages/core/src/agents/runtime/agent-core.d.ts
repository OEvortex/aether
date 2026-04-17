/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview AgentCore — the shared execution engine for subagents.
 *
 * AgentCore encapsulates the model reasoning loop, tool scheduling, stats,
 * and event emission. It is composed by both AgentHeadless (one-shot tasks)
 * and AgentInteractive (persistent interactive agents).
 *
 * AgentCore is stateless per-call: it does not own lifecycle or termination
 * logic. The caller (executor/collaborator) controls when to start, stop,
 * and how to interpret the results.
 */
import type { Content, FunctionCall, FunctionDeclaration } from '@google/genai';
import type { Config } from '../../config/config.js';
import { GeminiChat } from '../../core/geminiChat.js';
import type { AgentHooks } from './agent-events.js';
import { type AgentEventEmitter } from './agent-events.js';
import { type ContextState } from './agent-headless.js';
import { AgentStatistics, type AgentStatsSummary } from './agent-statistics.js';
import type { ModelConfig, PromptConfig, RunConfig, ToolConfig } from './agent-types.js';
import { AgentTerminateMode } from './agent-types.js';
/**
 * Result of a single reasoning loop invocation.
 */
export interface ReasoningLoopResult {
    /** The final model text response (empty if terminated by abort/limits). */
    text: string;
    /** Why the loop ended. null = normal text completion (no tool calls). */
    terminateMode: AgentTerminateMode | null;
    /** Number of model round-trips completed. */
    turnsUsed: number;
}
/**
 * Options for configuring a reasoning loop invocation.
 */
export interface ReasoningLoopOptions {
    /** Maximum number of turns before stopping. */
    maxTurns?: number;
    /** Maximum wall-clock time in minutes before stopping. */
    maxTimeMinutes?: number;
    /** Start time in ms (for timeout calculation). Defaults to Date.now(). */
    startTimeMs?: number;
}
/**
 * Options for chat creation.
 */
export interface CreateChatOptions {
    /**
     * When true, omits the "non-interactive mode" system prompt suffix.
     * Used by AgentInteractive for persistent interactive agents.
     */
    interactive?: boolean;
    /**
     * Optional conversation history from a parent session. When provided,
     * this history is prepended to the chat so the agent has prior
     * conversational context (e.g., from the main session that spawned it).
     */
    extraHistory?: Content[];
}
/**
 * Legacy execution stats maintained for backward compatibility.
 */
export interface ExecutionStats {
    startTimeMs: number;
    totalDurationMs: number;
    rounds: number;
    totalToolCalls: number;
    successfulToolCalls: number;
    failedToolCalls: number;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
}
/**
 * AgentCore — shared execution engine for model reasoning and tool scheduling.
 *
 * This class encapsulates:
 * - Chat/model session creation (`createChat`)
 * - Tool list preparation (`prepareTools`)
 * - The inner reasoning loop (`runReasoningLoop`)
 * - Tool call scheduling and execution (`processFunctionCalls`)
 * - Statistics tracking and event emission
 *
 * It does NOT manage lifecycle (start/stop/terminate), abort signals,
 * or final result interpretation — those are the caller's responsibility.
 */
export declare class AgentCore {
    readonly subagentId: string;
    readonly name: string;
    readonly runtimeContext: Config;
    readonly promptConfig: PromptConfig;
    readonly modelConfig: ModelConfig;
    readonly runConfig: RunConfig;
    readonly toolConfig?: ToolConfig;
    readonly eventEmitter?: AgentEventEmitter;
    readonly hooks?: AgentHooks;
    readonly stats: AgentStatistics;
    /**
     * Legacy execution stats maintained for aggregate tracking.
     */
    executionStats: ExecutionStats;
    /**
     * The prompt token count from the most recent model response.
     * Exposed so UI hooks can seed initial state without waiting for events.
     */
    lastPromptTokenCount: number;
    private toolUsage;
    constructor(name: string, runtimeContext: Config, promptConfig: PromptConfig, modelConfig: ModelConfig, runConfig: RunConfig, toolConfig?: ToolConfig, eventEmitter?: AgentEventEmitter, hooks?: AgentHooks);
    /**
     * Creates a GeminiChat instance configured for this agent.
     *
     * @param context - Context state for template variable substitution.
     * @param options - Chat creation options.
     *   - `interactive`: When true, omits the "non-interactive mode" system prompt suffix.
     * @returns A configured GeminiChat, or undefined if initialization fails.
     */
    createChat(context: ContextState, options?: CreateChatOptions): Promise<GeminiChat | undefined>;
    /**
     * Prepares the list of tools available to this agent.
     *
     * If no explicit toolConfig or it contains "*" or is empty,
     * inherits all tools (excluding AgentTool to prevent recursion).
     */
    prepareTools(): FunctionDeclaration[];
    /**
     * Runs the inner model reasoning loop.
     *
     * This is the core execution cycle:
     * send messages → stream response → collect tool calls → execute tools → repeat.
     *
     * The loop terminates when:
     * - The model produces a text response without tool calls (normal completion)
     * - maxTurns is reached
     * - maxTimeMinutes is exceeded
     * - The abortController signal fires
     *
     * @param chat - The GeminiChat session to use.
     * @param initialMessages - The first messages to send (e.g., user task prompt).
     * @param toolsList - Available tool declarations.
     * @param abortController - Controls cancellation of the current loop.
     * @param options - Optional limits (maxTurns, maxTimeMinutes).
     * @returns ReasoningLoopResult with the final text, terminate mode, and turns used.
     */
    runReasoningLoop(chat: GeminiChat, initialMessages: Content[], toolsList: FunctionDeclaration[], abortController: AbortController, options?: ReasoningLoopOptions): Promise<ReasoningLoopResult>;
    /**
     * Processes a list of function calls via CoreToolScheduler.
     *
     * Validates each call against the allowed tools list, schedules authorized
     * calls, collects results, and emits events for each call/result.
     *
     * Validates each call, schedules authorized calls, collects results, and emits events.
     */
    processFunctionCalls(functionCalls: FunctionCall[], abortController: AbortController, promptId: string, currentRound: number, toolsList: FunctionDeclaration[], responseId?: string): Promise<Content[]>;
    getEventEmitter(): AgentEventEmitter | undefined;
    getExecutionSummary(): AgentStatsSummary;
    /**
     * Returns legacy execution statistics and per-tool usage.
     * Returns legacy execution statistics and per-tool usage.
     */
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
    } & ExecutionStats;
    /**
     * Safely retrieves the description of a tool by attempting to build it.
     * Returns an empty string if any error occurs during the process.
     */
    getToolDescription(toolName: string, args: Record<string, unknown>): string;
    private getToolIsOutputMarkdown;
    /**
     * Records tool call statistics for both successful and failed tool calls.
     */
    recordToolCallStats(toolName: string, success: boolean, durationMs: number, errorMessage?: string): void;
    /**
     * Builds the system prompt with template substitution and optional
     * non-interactive instructions suffix.
     */
    private buildChatSystemPrompt;
    /**
     * Records token usage from model response metadata.
     */
    private recordTokenUsage;
}
