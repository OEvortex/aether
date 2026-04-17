/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import { EventEmitter } from 'node:events';
/**
 * Arena event types.
 */
export var ArenaEventType;
(function (ArenaEventType) {
    /** Arena session started */
    ArenaEventType["SESSION_START"] = "session_start";
    /** Informational or warning update during session lifecycle */
    ArenaEventType["SESSION_UPDATE"] = "session_update";
    /** Arena session completed */
    ArenaEventType["SESSION_COMPLETE"] = "session_complete";
    /** Arena session failed */
    ArenaEventType["SESSION_ERROR"] = "session_error";
    /** Agent started */
    ArenaEventType["AGENT_START"] = "agent_start";
    /** Agent status changed */
    ArenaEventType["AGENT_STATUS_CHANGE"] = "agent_status_change";
    /** Agent completed */
    ArenaEventType["AGENT_COMPLETE"] = "agent_complete";
    /** Agent error */
    ArenaEventType["AGENT_ERROR"] = "agent_error";
})(ArenaEventType || (ArenaEventType = {}));
/**
 * Event emitter for Arena events.
 */
export class ArenaEventEmitter {
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
    once(event, listener) {
        this.ee.once(event, listener);
    }
    removeAllListeners(event) {
        if (event) {
            this.ee.removeAllListeners(event);
        }
        else {
            this.ee.removeAllListeners();
        }
    }
}
//# sourceMappingURL=arena-events.js.map