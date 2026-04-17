/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ArenaControlSignal } from './types.js';
/**
 * ArenaAgentClient is used by child agent processes to communicate
 * their status back to the main ArenaManager process via file-based IPC.
 *
 * Status files are written to a centralized arena session directory:
 *   `<arenaSessionDir>/agents/<safeAgentId>.json`
 *
 * Control signals are read from:
 *   `<arenaSessionDir>/control/<safeAgentId>.json`
 *
 * It self-activates based on the ARENA_AGENT_ID environment variable.
 * When running outside an Arena session, `ArenaAgentClient.create()`
 * returns null.
 */
export declare class ArenaAgentClient {
    private readonly agentId;
    private readonly agentsDir;
    private readonly controlDir;
    private readonly statusFilePath;
    private readonly controlFilePath;
    private readonly startTimeMs;
    private initialized;
    /**
     * Static factory - returns an instance if ARENA_AGENT_ID, ARENA_SESSION_ID,
     * and ARENA_SESSION_DIR env vars are present, null otherwise.
     */
    static create(): ArenaAgentClient | null;
    constructor(agentId: string, arenaSessionDir: string);
    /**
     * Initialize the agents/ and control/ directories under the arena session
     * dir. Called automatically on first use if not invoked explicitly.
     */
    init(): Promise<void>;
    /**
     * Write current status to the per-agent status file using atomic write
     * (write to temp file then rename).
     *
     * Stats are derived automatically from uiTelemetryService which is the
     * canonical source for token counts, tool calls, and API request counts.
     */
    updateStatus(currentActivity?: string): Promise<void>;
    /**
     * Read and delete control.json (consume-once pattern).
     * Returns null if no control signal is pending.
     */
    checkControlSignal(): Promise<ArenaControlSignal | null>;
    /**
     * Report that the agent has completed the current task successfully.
     * This is the primary signal to the main process that the agent is done working.
     */
    reportCompleted(finalSummary?: string): Promise<void>;
    /**
     * Report that the agent hit an error (API/auth/rate-limit, loop, etc.).
     */
    reportError(errorMessage: string): Promise<void>;
    /**
     * Report that the agent's current request was cancelled by the user.
     */
    reportCancelled(): Promise<void>;
    /**
     * Build ArenaAgentStats from uiTelemetryService metrics
     */
    private getStatsFromTelemetry;
    private ensureInitialized;
}
