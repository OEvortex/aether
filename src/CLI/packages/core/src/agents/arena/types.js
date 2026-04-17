/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Maximum number of concurrent agents allowed in an Arena session.
 */
export const ARENA_MAX_AGENTS = 5;
/**
 * Represents the status of an Arena session.
 */
export var ArenaSessionStatus;
(function (ArenaSessionStatus) {
    /** Session is being set up */
    ArenaSessionStatus["INITIALIZING"] = "initializing";
    /** Session is running */
    ArenaSessionStatus["RUNNING"] = "running";
    /** All agents finished their current task and are idle (can accept follow-ups) */
    ArenaSessionStatus["IDLE"] = "idle";
    /** Session completed for good (winner selected or explicit end) */
    ArenaSessionStatus["COMPLETED"] = "completed";
    /** Session was cancelled */
    ArenaSessionStatus["CANCELLED"] = "cancelled";
    /** Session failed during initialization */
    ArenaSessionStatus["FAILED"] = "failed";
})(ArenaSessionStatus || (ArenaSessionStatus = {}));
/**
 * Convert an agentId (e.g. "arena-xxx/aether-clir-plus") to a filename-safe
 * string by replacing path-unsafe characters with "--".
 */
export function safeAgentId(agentId) {
    return agentId.replace(/[/\\:*?"<>|]/g, '--');
}
//# sourceMappingURL=types.js.map