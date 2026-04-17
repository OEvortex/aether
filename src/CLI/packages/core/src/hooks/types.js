/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import { createDebugLogger } from '../utils/debugLogger.js';
const debugLogger = createDebugLogger('TRUSTED_HOOKS');
export var HooksConfigSource;
(function (HooksConfigSource) {
    HooksConfigSource["Project"] = "project";
    HooksConfigSource["User"] = "user";
    HooksConfigSource["System"] = "system";
    HooksConfigSource["Extensions"] = "extensions";
})(HooksConfigSource || (HooksConfigSource = {}));
/**
 * Event names for the hook system
 */
export var HookEventName;
(function (HookEventName) {
    // PreToolUse - Before tool execution
    HookEventName["PreToolUse"] = "PreToolUse";
    // PostToolUse - After tool execution
    HookEventName["PostToolUse"] = "PostToolUse";
    // PostToolUseFailure - After tool execution fails
    HookEventName["PostToolUseFailure"] = "PostToolUseFailure";
    // Notification - When notifications are sent
    HookEventName["Notification"] = "Notification";
    // UserPromptSubmit - When the user submits a prompt
    HookEventName["UserPromptSubmit"] = "UserPromptSubmit";
    // SessionStart - When a new session is started
    HookEventName["SessionStart"] = "SessionStart";
    // Stop - Right before Claude concludes its response
    HookEventName["Stop"] = "Stop";
    // SubagentStart - When a subagent (Task tool call) is started
    HookEventName["SubagentStart"] = "SubagentStart";
    // SubagentStop - Right before a subagent (Task tool call) concludes its response
    HookEventName["SubagentStop"] = "SubagentStop";
    // PreCompact - Before conversation compaction
    HookEventName["PreCompact"] = "PreCompact";
    // SessionEnd - When a session is ending
    HookEventName["SessionEnd"] = "SessionEnd";
    // When a permission dialog is displayed
    HookEventName["PermissionRequest"] = "PermissionRequest";
})(HookEventName || (HookEventName = {}));
/**
 * Fields in the hooks configuration that are not hook event names
 */
export const HOOKS_CONFIG_FIELDS = ['enabled', 'disabled', 'notifications'];
/**
 * Hook implementation types
 */
export var HookType;
(function (HookType) {
    HookType["Command"] = "command";
})(HookType || (HookType = {}));
/**
 * Generate a unique key for a hook configuration
 */
export function getHookKey(hook) {
    const name = hook.name ?? '';
    return name ? `${name}:${hook.command}` : hook.command;
}
/**
 * Factory function to create the appropriate hook output class based on event name
 * Returns specialized HookOutput subclasses for events with specific methods
 */
export function createHookOutput(eventName, data) {
    switch (eventName) {
        case HookEventName.PreToolUse:
            return new PreToolUseHookOutput(data);
        case HookEventName.PostToolUse:
            return new PostToolUseHookOutput(data);
        case HookEventName.PostToolUseFailure:
            return new PostToolUseFailureHookOutput(data);
        case HookEventName.Stop:
        case HookEventName.SubagentStop:
            return new StopHookOutput(data);
        case HookEventName.PermissionRequest:
            return new PermissionRequestHookOutput(data);
        default:
            return new DefaultHookOutput(data);
    }
}
/**
 * Default implementation of HookOutput with utility methods
 */
export class DefaultHookOutput {
    continue;
    stopReason;
    suppressOutput;
    systemMessage;
    decision;
    reason;
    hookSpecificOutput;
    constructor(data = {}) {
        this.continue = data.continue;
        this.stopReason = data.stopReason;
        this.suppressOutput = data.suppressOutput;
        this.systemMessage = data.systemMessage;
        this.decision = data.decision;
        this.reason = data.reason;
        this.hookSpecificOutput = data.hookSpecificOutput;
    }
    /**
     * Check if this output represents a blocking decision
     */
    isBlockingDecision() {
        return this.decision === 'block' || this.decision === 'deny';
    }
    /**
     * Check if this output requests to stop execution
     */
    shouldStopExecution() {
        return this.continue === false;
    }
    /**
     * Get the effective reason for blocking or stopping
     */
    getEffectiveReason() {
        return this.stopReason || this.reason || 'No reason provided';
    }
    /**
     * Get sanitized additional context for adding to responses.
     */
    getAdditionalContext() {
        if (this.hookSpecificOutput &&
            'additionalContext' in this.hookSpecificOutput) {
            const context = this.hookSpecificOutput.additionalContext;
            if (typeof context !== 'string') {
                return undefined;
            }
            // Sanitize by escaping < and > to prevent tag injection
            return context.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
        return undefined;
    }
    /**
     * Check if execution should be blocked and return error info
     */
    getBlockingError() {
        if (this.isBlockingDecision()) {
            return {
                blocked: true,
                reason: this.getEffectiveReason()
            };
        }
        return { blocked: false, reason: '' };
    }
    /**
     * Check if context clearing was requested by hook.
     */
    shouldClearContext() {
        return false;
    }
}
/**
 * Specific hook output class for PreToolUse events.
 */
export class PreToolUseHookOutput extends DefaultHookOutput {
    /**
     * Get permission decision from hook output
     * @returns 'allow' | 'deny' | 'ask' | undefined
     */
    getPermissionDecision() {
        if (this.hookSpecificOutput &&
            'permissionDecision' in this.hookSpecificOutput) {
            const decision = this.hookSpecificOutput.permissionDecision;
            if (decision === 'allow' ||
                decision === 'deny' ||
                decision === 'ask') {
                return decision;
            }
        }
        // Fall back to base decision field
        if (this.decision === 'allow' || this.decision === 'approve') {
            return 'allow';
        }
        if (this.decision === 'deny' || this.decision === 'block') {
            return 'deny';
        }
        if (this.decision === 'ask') {
            return 'ask';
        }
        return undefined;
    }
    /**
     * Get permission decision reason
     */
    getPermissionDecisionReason() {
        if (this.hookSpecificOutput &&
            'permissionDecisionReason' in this.hookSpecificOutput) {
            const reason = this.hookSpecificOutput.permissionDecisionReason;
            if (typeof reason === 'string') {
                return reason;
            }
        }
        return this.reason;
    }
    /**
     * Check if permission was denied
     */
    isDenied() {
        return this.getPermissionDecision() === 'deny';
    }
    /**
     * Check if user confirmation is required
     */
    isAsk() {
        return this.getPermissionDecision() === 'ask';
    }
    /**
     * Check if permission was allowed
     */
    isAllowed() {
        return this.getPermissionDecision() === 'allow';
    }
}
/**
 * Specific hook output class for PostToolUse events.
 * Default behavior is to allow tool usage if the hook does not explicitly set a decision.
 * This follows the security model of allowing by default unless explicitly blocked.
 */
export class PostToolUseHookOutput extends DefaultHookOutput {
    decision;
    reason;
    constructor(data = {}) {
        super(data);
        // Default to allowing tool usage if hook does not provide explicit decision
        // This maintains backward compatibility and follows security model of allowing by default
        this.decision = data.decision ?? 'allow';
        this.reason = data.reason ?? 'No reason provided';
        // Log when default values are used to help with debugging
        if (data.decision === undefined) {
            debugLogger.debug('PostToolUseHookOutput: No explicit decision set, defaulting to "allow"');
        }
        if (data.reason === undefined) {
            debugLogger.debug('PostToolUseHookOutput: No explicit reason set, defaulting to "No reason provided"');
        }
    }
}
/**
 * Specific hook output class for PostToolUseFailure events.
 */
export class PostToolUseFailureHookOutput extends DefaultHookOutput {
    /**
     * Get additional context to provide error handling information
     */
    getAdditionalContext() {
        return super.getAdditionalContext();
    }
}
/**
 * Specific hook output class for Stop events.
 */
export class StopHookOutput extends DefaultHookOutput {
    stopReason;
    constructor(data = {}) {
        super(data);
        this.stopReason = data.stopReason;
    }
    /**
     * Get the stop reason if provided
     */
    getStopReason() {
        if (!this.stopReason) {
            return undefined;
        }
        return `Stop hook feedback:\n${this.stopReason}`;
    }
}
/**
 * Specific hook output class for PermissionRequest events.
 */
export class PermissionRequestHookOutput extends DefaultHookOutput {
    /**
     * Get the permission decision if provided by hook
     */
    getPermissionDecision() {
        if (this.hookSpecificOutput && 'decision' in this.hookSpecificOutput) {
            const decision = this.hookSpecificOutput.decision;
            if (typeof decision === 'object' &&
                decision !== null &&
                !Array.isArray(decision)) {
                return decision;
            }
        }
        return undefined;
    }
    /**
     * Check if the permission was denied
     */
    isPermissionDenied() {
        const decision = this.getPermissionDecision();
        return decision?.behavior === 'deny';
    }
    /**
     * Get the deny message if permission was denied
     */
    getDenyMessage() {
        const decision = this.getPermissionDecision();
        return decision?.message;
    }
    /**
     * Check if execution should be interrupted after denial
     */
    shouldInterrupt() {
        const decision = this.getPermissionDecision();
        return decision?.interrupt === true;
    }
    /**
     * Get updated tool input if permission was allowed with modifications
     */
    getUpdatedToolInput() {
        const decision = this.getPermissionDecision();
        return decision?.updatedInput;
    }
    /**
     * Get updated permissions if permission was allowed with permission updates
     */
    getUpdatedPermissions() {
        const decision = this.getPermissionDecision();
        return decision?.updatedPermissions;
    }
}
/**
 * Notification types
 */
export var NotificationType;
(function (NotificationType) {
    NotificationType["PermissionPrompt"] = "permission_prompt";
    NotificationType["IdlePrompt"] = "idle_prompt";
    NotificationType["AuthSuccess"] = "auth_success";
    NotificationType["ElicitationDialog"] = "elicitation_dialog";
})(NotificationType || (NotificationType = {}));
/**
 * SessionStart source types
 */
export var SessionStartSource;
(function (SessionStartSource) {
    SessionStartSource["Startup"] = "startup";
    SessionStartSource["Resume"] = "resume";
    SessionStartSource["Clear"] = "clear";
    SessionStartSource["Compact"] = "compact";
})(SessionStartSource || (SessionStartSource = {}));
export var PermissionMode;
(function (PermissionMode) {
    PermissionMode["Default"] = "default";
    PermissionMode["Plan"] = "plan";
    PermissionMode["AutoEdit"] = "auto_edit";
    PermissionMode["Yolo"] = "yolo";
})(PermissionMode || (PermissionMode = {}));
/**
 * SessionEnd reason types
 */
export var SessionEndReason;
(function (SessionEndReason) {
    SessionEndReason["Clear"] = "clear";
    SessionEndReason["Logout"] = "logout";
    SessionEndReason["PromptInputExit"] = "prompt_input_exit";
    SessionEndReason["Bypass_permissions_disabled"] = "bypass_permissions_disabled";
    SessionEndReason["Other"] = "other";
})(SessionEndReason || (SessionEndReason = {}));
/**
 * PreCompress trigger types
 */
export var PreCompactTrigger;
(function (PreCompactTrigger) {
    PreCompactTrigger["Manual"] = "manual";
    PreCompactTrigger["Auto"] = "auto";
})(PreCompactTrigger || (PreCompactTrigger = {}));
export var AgentType;
(function (AgentType) {
    AgentType["Bash"] = "Bash";
    AgentType["Explorer"] = "Explorer";
    AgentType["Plan"] = "Plan";
    AgentType["Custom"] = "Custom";
})(AgentType || (AgentType = {}));
//# sourceMappingURL=types.js.map