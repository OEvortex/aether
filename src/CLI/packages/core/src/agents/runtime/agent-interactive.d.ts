/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import { type ToolCallConfirmationDetails, type ToolResultDisplay } from '../../tools/tools.js';
import type { AgentCore } from './agent-core.js';
import { type AgentEventEmitter } from './agent-events.js';
import type { ContextState } from './agent-headless.js';
import type { AgentStatsSummary } from './agent-statistics.js';
import { type AgentInteractiveConfig, type AgentMessage, AgentStatus } from './agent-types.js';
/**
 * AgentInteractive — persistent interactive agent that processes
 * messages on demand.
 *
 * Three-level cancellation:
 * - `cancelCurrentRound()` — abort the current reasoning loop only
 * - `shutdown()` — graceful: stop accepting messages, wait for cycle
 * - `abort()` — immediate: master abort, set cancelled
 */
export declare class AgentInteractive {
    readonly config: AgentInteractiveConfig;
    private readonly core;
    private readonly queue;
    private readonly messages;
    private status;
    private error;
    private lastRoundError;
    private executionPromise;
    private masterAbortController;
    private roundAbortController;
    private chat;
    private toolsList;
    private processing;
    private roundCancelledByUser;
    private readonly pendingApprovals;
    private readonly liveOutputs;
    private readonly shellPids;
    constructor(config: AgentInteractiveConfig, core: AgentCore);
    /**
     * Start the agent. Initializes the chat session, then kicks off
     * processing if an initialTask is configured.
     */
    start(context: ContextState): Promise<void>;
    /**
     * Run loop: process all pending messages, then settle status.
     * Exits when the queue is empty or the agent is aborted.
     */
    private runLoop;
    /**
     * Run a single reasoning round for one message.
     * Creates a per-round AbortController so cancellation is scoped.
     */
    private runOneRound;
    /**
     * Cancel only the current reasoning round.
     * Adds a visible "cancelled" info message and clears pending approvals.
     */
    cancelCurrentRound(): void;
    /**
     * Graceful shutdown: stop accepting messages and wait for current
     * processing to finish.
     */
    shutdown(): Promise<void>;
    /**
     * Immediate abort: cancel everything and set status to cancelled.
     */
    abort(): void;
    /**
     * Enqueue a message for the agent to process.
     */
    enqueueMessage(message: string): void;
    getMessages(): readonly AgentMessage[];
    getStatus(): AgentStatus;
    getError(): string | undefined;
    getLastRoundError(): string | undefined;
    getStats(): AgentStatsSummary;
    /** The prompt token count from the most recent model call. */
    getLastPromptTokenCount(): number;
    getCore(): AgentCore;
    getEventEmitter(): AgentEventEmitter | undefined;
    /**
     * Returns tool calls currently awaiting user approval.
     * Keyed by callId → full ToolCallConfirmationDetails (with onConfirm).
     * The UI reads this to render confirmation dialogs inside ToolGroupMessage.
     */
    getPendingApprovals(): ReadonlyMap<string, ToolCallConfirmationDetails>;
    /**
     * Returns live output for currently-executing tools.
     * Keyed by callId → latest ToolResultDisplay (replaces on each update).
     * Entries are cleared when TOOL_RESULT arrives for the call.
     */
    getLiveOutputs(): ReadonlyMap<string, ToolResultDisplay>;
    /**
     * Returns PTY PIDs for currently-executing interactive shell tools.
     * Keyed by callId → PID. Populated from TOOL_OUTPUT_UPDATE when pid is
     * present; cleared when TOOL_RESULT arrives. The UI uses this to enable
     * interactive shell input via HistoryItemDisplay's activeShellPtyId prop.
     */
    getShellPids(): ReadonlyMap<string, number>;
    /**
     * Wait for the run loop to finish (used by InProcessBackend).
     */
    waitForCompletion(): Promise<void>;
    /**
     * Settle status after the run loop empties.
     * On success → IDLE (agent stays alive for follow-up messages).
     * On error → FAILED (terminal).
     */
    private settleRoundStatus;
    private setStatus;
    private addMessage;
    private setupEventListeners;
}
