/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { uiTelemetryService } from '../../telemetry/uiTelemetry.js';
import { atomicWriteJSON } from '../../utils/atomicFileWrite.js';
import { createDebugLogger } from '../../utils/debugLogger.js';
import { isNodeError } from '../../utils/errors.js';
import { AgentStatus } from '../runtime/agent-types.js';
import { safeAgentId } from './types.js';
const debugLogger = createDebugLogger('ARENA_AGENT_CLIENT');
const AGENTS_SUBDIR = 'agents';
const CONTROL_SUBDIR = 'control';
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
export class ArenaAgentClient {
    agentId;
    agentsDir;
    controlDir;
    statusFilePath;
    controlFilePath;
    startTimeMs;
    initialized = false;
    /**
     * Static factory - returns an instance if ARENA_AGENT_ID, ARENA_SESSION_ID,
     * and ARENA_SESSION_DIR env vars are present, null otherwise.
     */
    static create() {
        const agentId = process.env.ARENA_AGENT_ID;
        const sessionId = process.env.ARENA_SESSION_ID;
        const sessionDir = process.env.ARENA_SESSION_DIR;
        if (!agentId || !sessionId || !sessionDir) {
            return null;
        }
        return new ArenaAgentClient(agentId, sessionDir);
    }
    constructor(agentId, arenaSessionDir) {
        this.agentId = agentId;
        const safe = safeAgentId(agentId);
        this.agentsDir = path.join(arenaSessionDir, AGENTS_SUBDIR);
        this.controlDir = path.join(arenaSessionDir, CONTROL_SUBDIR);
        this.statusFilePath = path.join(this.agentsDir, `${safe}.json`);
        this.controlFilePath = path.join(this.controlDir, `${safe}.json`);
        this.startTimeMs = Date.now();
    }
    /**
     * Initialize the agents/ and control/ directories under the arena session
     * dir. Called automatically on first use if not invoked explicitly.
     */
    async init() {
        await fs.mkdir(this.agentsDir, { recursive: true });
        await fs.mkdir(this.controlDir, { recursive: true });
        this.initialized = true;
        debugLogger.info(`ArenaAgentClient initialized for agent ${this.agentId} at ${this.agentsDir}`);
    }
    /**
     * Write current status to the per-agent status file using atomic write
     * (write to temp file then rename).
     *
     * Stats are derived automatically from uiTelemetryService which is the
     * canonical source for token counts, tool calls, and API request counts.
     */
    async updateStatus(currentActivity) {
        await this.ensureInitialized();
        const stats = this.getStatsFromTelemetry();
        const statusFile = {
            agentId: this.agentId,
            status: AgentStatus.RUNNING,
            updatedAt: Date.now(),
            rounds: stats.rounds,
            currentActivity,
            stats,
            finalSummary: null,
            error: null
        };
        await atomicWriteJSON(this.statusFilePath, statusFile);
    }
    /**
     * Read and delete control.json (consume-once pattern).
     * Returns null if no control signal is pending.
     */
    async checkControlSignal() {
        await this.ensureInitialized();
        try {
            const content = await fs.readFile(this.controlFilePath, 'utf-8');
            // Parse before deleting so a corrupted file isn't silently consumed
            const signal = JSON.parse(content);
            await fs.unlink(this.controlFilePath);
            return signal;
        }
        catch (error) {
            // File doesn't exist = no signal pending
            if (isNodeError(error) && error.code === 'ENOENT') {
                return null;
            }
            // Re-throw permission errors so they surface immediately
            if (isNodeError(error) && error.code === 'EACCES') {
                throw error;
            }
            debugLogger.error('Error reading control signal:', error);
            return null;
        }
    }
    /**
     * Report that the agent has completed the current task successfully.
     * This is the primary signal to the main process that the agent is done working.
     */
    async reportCompleted(finalSummary) {
        await this.ensureInitialized();
        const stats = this.getStatsFromTelemetry();
        const statusFile = {
            agentId: this.agentId,
            status: AgentStatus.COMPLETED,
            updatedAt: Date.now(),
            rounds: stats.rounds,
            stats,
            finalSummary: finalSummary ?? null,
            error: null
        };
        await atomicWriteJSON(this.statusFilePath, statusFile);
    }
    /**
     * Report that the agent hit an error (API/auth/rate-limit, loop, etc.).
     */
    async reportError(errorMessage) {
        await this.ensureInitialized();
        const stats = this.getStatsFromTelemetry();
        const statusFile = {
            agentId: this.agentId,
            status: AgentStatus.FAILED,
            updatedAt: Date.now(),
            rounds: stats.rounds,
            stats,
            finalSummary: null,
            error: errorMessage
        };
        await atomicWriteJSON(this.statusFilePath, statusFile);
    }
    /**
     * Report that the agent's current request was cancelled by the user.
     */
    async reportCancelled() {
        await this.ensureInitialized();
        const stats = this.getStatsFromTelemetry();
        const statusFile = {
            agentId: this.agentId,
            status: AgentStatus.CANCELLED,
            updatedAt: Date.now(),
            rounds: stats.rounds,
            stats,
            finalSummary: null,
            error: null
        };
        await atomicWriteJSON(this.statusFilePath, statusFile);
    }
    /**
     * Build ArenaAgentStats from uiTelemetryService metrics
     */
    getStatsFromTelemetry() {
        const metrics = uiTelemetryService.getMetrics();
        let rounds = 0;
        let totalTokens = 0;
        let inputTokens = 0;
        let outputTokens = 0;
        for (const model of Object.values(metrics.models)) {
            rounds += model.api.totalRequests;
            totalTokens += model.tokens.total;
            inputTokens += model.tokens.prompt;
            outputTokens += model.tokens.candidates;
        }
        return {
            rounds,
            totalTokens,
            inputTokens,
            outputTokens,
            durationMs: Date.now() - this.startTimeMs,
            toolCalls: metrics.tools.totalCalls,
            successfulToolCalls: metrics.tools.totalSuccess,
            failedToolCalls: metrics.tools.totalFail
        };
    }
    async ensureInitialized() {
        if (!this.initialized) {
            await this.init();
        }
    }
}
//# sourceMappingURL=ArenaAgentClient.js.map