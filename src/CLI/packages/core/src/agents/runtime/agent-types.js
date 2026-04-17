/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Describes the possible termination modes for an agent.
 * This enum provides a clear indication of why an agent's execution ended.
 */
export var AgentTerminateMode;
(function (AgentTerminateMode) {
    /** The agent's execution terminated due to an unrecoverable error. */
    AgentTerminateMode["ERROR"] = "ERROR";
    /** The agent's execution terminated because it exceeded the maximum allowed working time. */
    AgentTerminateMode["TIMEOUT"] = "TIMEOUT";
    /** The agent's execution successfully completed all its defined goals. */
    AgentTerminateMode["GOAL"] = "GOAL";
    /** The agent's execution terminated because it exceeded the maximum number of turns. */
    AgentTerminateMode["MAX_TURNS"] = "MAX_TURNS";
    /** The agent's execution was cancelled via an abort signal. */
    AgentTerminateMode["CANCELLED"] = "CANCELLED";
    /** The agent was gracefully shut down (e.g., arena/team session ended). */
    AgentTerminateMode["SHUTDOWN"] = "SHUTDOWN";
})(AgentTerminateMode || (AgentTerminateMode = {}));
// ─── Agent Status ────────────────────────────────────────────
/**
 * Canonical lifecycle status for any agent (headless, interactive, arena).
 *
 * State machine:
 *   INITIALIZING → RUNNING → IDLE ⇄ RUNNING → … → COMPLETED / FAILED / CANCELLED
 *
 * - INITIALIZING: Setting up (creating chat, loading tools).
 * - RUNNING:      Actively processing (model thinking / tool execution).
 * - IDLE:         Finished current work, waiting — can accept new messages.
 * - COMPLETED:    Finished for good (explicit shutdown). No further interaction.
 * - FAILED:       Finished with error (API failure, process crash, etc.).
 * - CANCELLED:    Cancelled by user or system.
 */
export var AgentStatus;
(function (AgentStatus) {
    AgentStatus["INITIALIZING"] = "initializing";
    AgentStatus["RUNNING"] = "running";
    AgentStatus["IDLE"] = "idle";
    AgentStatus["COMPLETED"] = "completed";
    AgentStatus["FAILED"] = "failed";
    AgentStatus["CANCELLED"] = "cancelled";
})(AgentStatus || (AgentStatus = {}));
/** True for COMPLETED, FAILED, CANCELLED — agent is done for good. */
export const isTerminalStatus = (s) => s === AgentStatus.COMPLETED ||
    s === AgentStatus.FAILED ||
    s === AgentStatus.CANCELLED;
/** True for IDLE or COMPLETED — agent finished its work successfully. */
export const isSuccessStatus = (s) => s === AgentStatus.IDLE || s === AgentStatus.COMPLETED;
/** True for terminal statuses OR IDLE — agent has settled (not actively working). */
export const isSettledStatus = (s) => s === AgentStatus.IDLE || isTerminalStatus(s);
//# sourceMappingURL=agent-types.js.map