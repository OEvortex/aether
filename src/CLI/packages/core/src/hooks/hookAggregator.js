/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import { DefaultHookOutput, HookEventName, PermissionRequestHookOutput, PostToolUseFailureHookOutput, PostToolUseHookOutput, PreToolUseHookOutput, StopHookOutput } from './types.js';
/**
 * HookAggregator merges multiple hook outputs using event-specific rules.
 *
 * Different events have different merging strategies:
 * - PreToolUse/PostToolUse: OR logic for decisions, concatenation for messages
 */
export class HookAggregator {
    /**
     * Aggregate results from multiple hook executions
     */
    aggregateResults(results, eventName) {
        const allOutputs = [];
        const errors = [];
        let totalDuration = 0;
        for (const result of results) {
            totalDuration += result.duration;
            if (!result.success && result.error) {
                errors.push(result.error);
            }
            if (result.output) {
                allOutputs.push(result.output);
            }
        }
        const success = errors.length === 0;
        const finalOutput = this.mergeOutputs(allOutputs, eventName);
        return {
            success,
            allOutputs,
            errors,
            totalDuration,
            finalOutput
        };
    }
    /**
     * Merge multiple hook outputs based on event type
     */
    mergeOutputs(outputs, eventName) {
        if (outputs.length === 0) {
            return undefined;
        }
        if (outputs.length === 1) {
            return this.createSpecificHookOutput(outputs[0], eventName);
        }
        let merged;
        switch (eventName) {
            case HookEventName.PreToolUse:
            case HookEventName.PostToolUse:
            case HookEventName.PostToolUseFailure:
            case HookEventName.Stop:
            case HookEventName.UserPromptSubmit:
            case HookEventName.SubagentStop:
                merged = this.mergeWithOrLogic(outputs, eventName);
                break;
            case HookEventName.PermissionRequest:
                merged = this.mergePermissionRequestOutputs(outputs);
                break;
            default:
                merged = this.mergeSimple(outputs);
        }
        return this.createSpecificHookOutput(merged, eventName);
    }
    /**
     * Merge outputs using OR logic for decisions and concatenation for messages.
     *
     * Rules:
     * - Any "block" or "deny" decision results in blocking (most restrictive wins)
     * - Reasons are concatenated with newlines
     * - continue=false takes precedence over continue=true
     * - Additional context is concatenated
     * - For PostToolUse, decision and reason are required fields
     */
    mergeWithOrLogic(outputs, _eventName) {
        const merged = {};
        const reasons = [];
        const additionalContexts = [];
        let hasBlock = false;
        let hasContinueFalse = false;
        let stopReason;
        const otherHookSpecificFields = {};
        for (const output of outputs) {
            // Check for blocking decisions
            if (output.decision === 'block' || output.decision === 'deny') {
                hasBlock = true;
            }
            // Collect reasons
            if (output.reason) {
                reasons.push(output.reason);
            }
            // Check continue flag
            if (output.continue === false) {
                hasContinueFalse = true;
                if (output.stopReason) {
                    stopReason = output.stopReason;
                }
            }
            // Extract additional context
            this.extractAdditionalContext(output, additionalContexts);
            // Collect other hookSpecificOutput fields (later values win)
            if (output.hookSpecificOutput) {
                for (const [key, value] of Object.entries(output.hookSpecificOutput)) {
                    if (key !== 'additionalContext') {
                        otherHookSpecificFields[key] = value;
                    }
                }
            }
            // Copy other fields (later values win for simple fields)
            if (output.suppressOutput !== undefined) {
                merged.suppressOutput = output.suppressOutput;
            }
            if (output.systemMessage !== undefined) {
                merged.systemMessage = output.systemMessage;
            }
        }
        // Set merged decision
        if (hasBlock) {
            merged.decision = 'block';
        }
        else if (outputs.some((o) => o.decision === 'allow')) {
            merged.decision = 'allow';
        }
        // Set merged reason
        if (reasons.length > 0) {
            merged.reason = reasons.join('\n');
        }
        // Set continue flag
        if (hasContinueFalse) {
            merged.continue = false;
            if (stopReason) {
                merged.stopReason = stopReason;
            }
        }
        // Build hookSpecificOutput
        const hookSpecificOutput = {
            ...otherHookSpecificFields
        };
        if (additionalContexts.length > 0) {
            hookSpecificOutput.additionalContext =
                additionalContexts.join('\n');
        }
        if (Object.keys(hookSpecificOutput).length > 0) {
            merged.hookSpecificOutput = hookSpecificOutput;
        }
        return merged;
    }
    /**
     * Merge outputs for mergePermissionRequestOutputs events.
     *
     * Rules:
     * - behavior: deny wins over allow (security priority)
     * - message: concatenated with newlines
     * - updatedInput: later values win
     * - updatedPermissions: concatenated
     * - interrupt: true wins over false
     */
    mergePermissionRequestOutputs(outputs) {
        const merged = {};
        const messages = [];
        let hasDeny = false;
        let hasAllow = false;
        let interrupt = false;
        let updatedInput;
        const allUpdatedPermissions = [];
        for (const output of outputs) {
            const specific = output.hookSpecificOutput;
            if (!specific) {
                continue;
            }
            const decision = specific.decision;
            if (!decision) {
                continue;
            }
            // Check behavior
            if (decision.behavior === 'deny') {
                hasDeny = true;
            }
            else if (decision.behavior === 'allow') {
                hasAllow = true;
            }
            // Collect message
            if (decision.message) {
                messages.push(decision.message);
            }
            // Check interrupt - true wins
            if (decision.interrupt === true) {
                interrupt = true;
            }
            // Collect updatedInput - use last non-empty
            if (decision.updatedInput) {
                updatedInput = decision.updatedInput;
            }
            // Collect updatedPermissions
            if (decision.updatedPermissions) {
                allUpdatedPermissions.push(...decision.updatedPermissions);
            }
            // Copy other fields
            if (output.continue !== undefined) {
                merged.continue = output.continue;
            }
            if (output.reason !== undefined) {
                merged.reason = output.reason;
            }
        }
        // Build merged decision
        const mergedDecision = {};
        if (hasDeny) {
            mergedDecision.behavior = 'deny';
        }
        else if (hasAllow) {
            mergedDecision.behavior = 'allow';
        }
        if (messages.length > 0) {
            mergedDecision.message = messages.join('\n');
        }
        if (interrupt) {
            mergedDecision.interrupt = true;
        }
        if (updatedInput) {
            mergedDecision.updatedInput = updatedInput;
        }
        if (allUpdatedPermissions.length > 0) {
            mergedDecision.updatedPermissions = allUpdatedPermissions;
        }
        merged.hookSpecificOutput = {
            ...merged.hookSpecificOutput,
            decision: mergedDecision
        };
        return merged;
    }
    /**
     * Simple merge for events without special logic
     */
    mergeSimple(outputs) {
        const additionalContexts = [];
        let merged = {};
        for (const output of outputs) {
            // Collect additionalContext for concatenation
            this.extractAdditionalContext(output, additionalContexts);
            merged = { ...merged, ...output };
        }
        // Merge additionalContext with concatenation
        if (additionalContexts.length > 0) {
            merged.hookSpecificOutput = {
                ...merged.hookSpecificOutput,
                additionalContext: additionalContexts.join('\n')
            };
        }
        return merged;
    }
    /**
     * Create the appropriate specific hook output class based on event type
     */
    createSpecificHookOutput(output, eventName) {
        switch (eventName) {
            case HookEventName.PreToolUse:
                return new PreToolUseHookOutput(output);
            case HookEventName.PostToolUse:
                return new PostToolUseHookOutput(output);
            case HookEventName.PostToolUseFailure:
                return new PostToolUseFailureHookOutput(output);
            case HookEventName.Stop:
            case HookEventName.SubagentStop:
                return new StopHookOutput(output);
            case HookEventName.PermissionRequest:
                return new PermissionRequestHookOutput(output);
            default:
                return new DefaultHookOutput(output);
        }
    }
    /**
     * Extract additional context from hook-specific outputs
     */
    extractAdditionalContext(output, contexts) {
        const specific = output.hookSpecificOutput;
        if (!specific) {
            return;
        }
        // Extract additionalContext from various hook types
        if ('additionalContext' in specific &&
            typeof specific.additionalContext === 'string') {
            contexts.push(specific.additionalContext);
        }
    }
}
//# sourceMappingURL=hookAggregator.js.map