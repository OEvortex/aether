/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../../config/config.js';
import type { AnsiOutput } from '../../utils/terminalSerializer.js';
import type { Backend } from '../index.js';
import { ArenaEventEmitter } from './arena-events.js';
import { type ArenaAgentState, type ArenaCallbacks, type ArenaControlSignal, type ArenaSessionResult, ArenaSessionStatus, type ArenaStartOptions } from './types.js';
/**
 * ArenaManager orchestrates multi-model competitive execution.
 *
 * It manages:
 * - Git worktree creation for isolated environments
 * - Parallel agent execution via PTY subprocesses (through Backend)
 * - Event emission for UI updates
 * - Result collection and comparison
 * - Active agent switching, input routing, and screen capture
 */
export declare class ArenaManager {
    private readonly config;
    private readonly eventEmitter;
    private readonly worktreeService;
    private readonly arenaBaseDir;
    private readonly callbacks;
    private backend;
    private cachedResult;
    private sessionId;
    /** Short directory name used for worktree paths (derived from sessionId). */
    private worktreeDirName;
    private sessionStatus;
    private agents;
    private arenaConfig;
    private startedAt;
    private masterAbortController;
    private terminalCols;
    private terminalRows;
    private pollingInterval;
    private lifecyclePromise;
    /** Cleanup functions for in-process event bridge listeners. */
    private eventBridgeCleanups;
    /** Guard to prevent double-emitting the session-ended telemetry event. */
    private sessionEndedLogged;
    constructor(config: Config, callbacks?: ArenaCallbacks);
    /**
     * Get the event emitter for subscribing to Arena events.
     */
    getEventEmitter(): ArenaEventEmitter;
    /**
     * Get the current session ID.
     */
    getSessionId(): string | undefined;
    /**
     * Get the current session status.
     */
    getSessionStatus(): ArenaSessionStatus;
    /**
     * Get the current task description (available while session is active).
     */
    getTask(): string | undefined;
    /**
     * Get all agent states.
     */
    getAgentStates(): ArenaAgentState[];
    /**
     * Get a specific agent state.
     */
    getAgentState(agentId: string): ArenaAgentState | undefined;
    /**
     * Get the cached session result (available after session completes).
     */
    getResult(): ArenaSessionResult | null;
    /**
     * Get the underlying backend for direct access.
     * Returns null before the session initializes a backend.
     */
    getBackend(): Backend | null;
    /**
     * Store the outer lifecycle promise so cancel/stop can wait for start()
     * to fully unwind before proceeding with cleanup.
     */
    setLifecyclePromise(p: Promise<void>): void;
    /**
     * Wait for the start lifecycle to fully settle (including error handling
     * and listener teardown). Resolves immediately if no lifecycle is active.
     */
    waitForSettled(): Promise<void>;
    /**
     * Switch the active agent for screen display and input routing.
     */
    switchToAgent(agentId: string): void;
    /**
     * Switch to the next agent in order.
     */
    switchToNextAgent(): void;
    /**
     * Switch to the previous agent in order.
     */
    switchToPreviousAgent(): void;
    /**
     * Get the ID of the currently active agent.
     */
    getActiveAgentId(): string | null;
    /**
     * Get the screen snapshot for the currently active agent.
     */
    getActiveSnapshot(): AnsiOutput | null;
    /**
     * Get the screen snapshot for a specific agent.
     */
    getAgentSnapshot(agentId: string, scrollOffset?: number): AnsiOutput | null;
    /**
     * Get the maximum scrollback length for an agent's terminal buffer.
     */
    getAgentScrollbackLength(agentId: string): number;
    /**
     * Forward keyboard input to the currently active agent.
     */
    forwardInput(data: string): boolean;
    /**
     * Resize all agent terminals.
     */
    resizeAgents(cols: number, rows: number): void;
    /**
     * Start an Arena session.
     *
     * @param options - Arena start options
     * @returns Promise resolving to the session result
     */
    start(options: ArenaStartOptions): Promise<ArenaSessionResult>;
    /**
     * Cancel the current Arena session.
     */
    cancel(): Promise<void>;
    /**
     * Clean up the Arena session (remove worktrees, kill processes, etc.).
     */
    cleanup(): Promise<void>;
    /**
     * Clean up runtime resources (processes, backend, memory) without removing
     * worktrees or session files on disk. Used when preserveArtifacts is enabled.
     */
    cleanupRuntime(): Promise<void>;
    /**
     * Apply the result from a specific agent to the main working directory.
     */
    applyAgentResult(agentId: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Get the diff for a specific agent's changes.
     */
    getAgentDiff(agentId: string): Promise<string>;
    /**
     * Emit the `arena_session_ended` telemetry event exactly once.
     *
     * Called from:
     *  - start() early-cancel paths → 'cancelled'
     *  - start() catch block → 'failed'
     *  - applyAgentResult() on success → 'selected' (with winner)
     *  - cleanup() / cleanupRuntime() → 'discarded' (user left without picking)
     */
    private emitSessionEnded;
    /**
     * Emit a progress message via SESSION_UPDATE so the UI can display
     * setup status.
     */
    private emitProgress;
    private validateStartOptions;
    /**
     * Initialize the backend.
     */
    private initializeBackend;
    /**
     * Derive a short, filesystem-friendly directory name from the full session ID.
     * Uses the first 8 hex characters of the UUID. If that path already exists,
     * appends a numeric suffix (-2, -3, …) until an unused name is found.
     */
    private deriveWorktreeDirName;
    private setupWorktrees;
    private runAgents;
    private spawnAgentPty;
    private requireBackend;
    private requireConfig;
    private handleAgentExit;
    /**
     * Build the spawn configuration for an agent subprocess.
     *
     * The agent is launched as a full interactive CLI instance, running in
     * its own worktree with the specified model. The task is passed via
     * the --prompt argument so the CLI enters interactive mode and
     * immediately starts working on the task.
     */
    private buildAgentSpawnConfig;
    /** Decide whether a status transition is valid. Returns the new status or null. */
    private resolveTransition;
    private updateAgentStatus;
    private buildAgentResult;
    /**
     * Get the arena session directory for the current session.
     * All status and control files are stored here.
     *
     * Returns the absolute path to the session directory, e.g.
     * `~/.aether/worktrees/<sessionId>/`.  The directory contains:
     * - `config.json` — consolidated session config + per-agent status
     * - `agents/<safeAgentId>.json` — individual agent status files
     * - `control/` — control signals (shutdown, cancel)
     */
    getArenaSessionDir(): string;
    /**
     * Wait for all agents to reach IDLE or TERMINATED state.
     * Returns true if all agents settled, false if timeout was reached.
     */
    private waitForAllAgentsSettled;
    /**
     * Start polling agent status files at a fixed interval.
     */
    private startPolling;
    /**
     * Stop the polling interval.
     */
    private stopPolling;
    /**
     * Set up event bridges for in-process agents.
     * Subscribes to each AgentInteractive's events to update ArenaManager state.
     * Listeners are tracked in `eventBridgeCleanups` for teardown.
     */
    private setupInProcessEventBridge;
    /**
     * Remove all event bridge listeners registered by setupInProcessEventBridge.
     */
    private teardownEventBridge;
    /**
     * Read per-agent status files from `<arenaSessionDir>/agents/` directory.
     * Updates agent stats, emits AGENT_STATS_UPDATE events, and writes a
     * consolidated `status.json` at the arena session root.
     */
    private pollAgentStatuses;
    /**
     * Merge agent status data into the arena session's config.json.
     * Reads the existing config, adds/updates `updatedAt` and `agents`,
     * then writes back atomically (temp file → rename).
     */
    private writeConsolidatedStatus;
    /**
     * Build an ArenaStatusFile snapshot from in-memory agent state.
     */
    private buildStatusFile;
    /**
     * Write status files for all in-process agents and update the
     * consolidated config.json.
     *
     * In PTY mode these files are written by ArenaAgentClient inside each
     * child process. In in-process mode there is no child process, so the
     * ArenaManager writes them directly so that external consumers
     * (e.g. an orchestrating agent) get a consistent file-based view
     * regardless of backend.
     */
    private flushInProcessStatusFiles;
    /**
     * Write a control signal to the arena session's control/ directory.
     * The child agent consumes (reads + deletes) this file.
     */
    sendControlSignal(agentId: string, type: ArenaControlSignal['type'], reason: string): Promise<void>;
    private collectResults;
}
