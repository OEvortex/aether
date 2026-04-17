/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Agent event types, emitter, and lifecycle hooks.
 *
 * Defines the observation/notification contracts for the agent runtime:
 * - Event types emitted during agent execution (streaming, tool calls, etc.)
 * - AgentEventEmitter — typed wrapper around EventEmitter
 * - Lifecycle hooks (pre/post tool use, stop) for synchronous callbacks
 */
import { EventEmitter } from 'node:events';
export var AgentEventType;
(function (AgentEventType) {
    AgentEventType["START"] = "start";
    AgentEventType["ROUND_START"] = "round_start";
    AgentEventType["ROUND_END"] = "round_end";
    /** Complete round text, emitted once after streaming before tool calls. */
    AgentEventType["ROUND_TEXT"] = "round_text";
    AgentEventType["STREAM_TEXT"] = "stream_text";
    AgentEventType["TOOL_CALL"] = "tool_call";
    AgentEventType["TOOL_RESULT"] = "tool_result";
    AgentEventType["TOOL_OUTPUT_UPDATE"] = "tool_output_update";
    AgentEventType["TOOL_WAITING_APPROVAL"] = "tool_waiting_approval";
    AgentEventType["USAGE_METADATA"] = "usage_metadata";
    AgentEventType["FINISH"] = "finish";
    AgentEventType["ERROR"] = "error";
    AgentEventType["STATUS_CHANGE"] = "status_change";
})(AgentEventType || (AgentEventType = {}));
// ─── Event Emitter ──────────────────────────────────────────
export class AgentEventEmitter {
    ee = new EventEmitter();
    on(event, listener) {
        this.ee.on(event, listener);
    }
    off(event, listener) {
        this.ee.off(event, listener);
    }
    emit(event, payload) {
        this.ee.emit(event, payload);
    }
}
//# sourceMappingURL=agent-events.js.map