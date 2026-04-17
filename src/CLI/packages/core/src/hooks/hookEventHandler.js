/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import { logHookCall } from '../telemetry/loggers.js';
import { HookCallEvent } from '../telemetry/types.js';
import { createDebugLogger } from '../utils/debugLogger.js';
import { HookEventName, PermissionMode } from './types.js';
const debugLogger = createDebugLogger('TRUSTED_HOOKS');
/**
 * Hook event bus that coordinates hook execution across the system
 */
export class HookEventHandler {
    config;
    hookPlanner;
    hookRunner;
    hookAggregator;
    constructor(config, hookPlanner, hookRunner, hookAggregator) {
        this.config = config;
        this.hookPlanner = hookPlanner;
        this.hookRunner = hookRunner;
        this.hookAggregator = hookAggregator;
    }
    /**
     * Fire a UserPromptSubmit event
     * Called by handleHookExecutionRequest - executes hooks directly
     */
    async fireUserPromptSubmitEvent(prompt, signal) {
        const input = {
            ...this.createBaseInput(HookEventName.UserPromptSubmit),
            prompt
        };
        return this.executeHooks(HookEventName.UserPromptSubmit, input, undefined, signal);
    }
    /**
     * Fire a Stop event
     * Called by handleHookExecutionRequest - executes hooks directly
     */
    async fireStopEvent(stopHookActive = false, lastAssistantMessage = '', signal) {
        const input = {
            ...this.createBaseInput(HookEventName.Stop),
            stop_hook_active: stopHookActive,
            last_assistant_message: lastAssistantMessage
        };
        return this.executeHooks(HookEventName.Stop, input, undefined, signal);
    }
    /**
     * Fire a SessionStart event
     * Called when a new session starts or resumes
     */
    async fireSessionStartEvent(source, model, permissionMode, agentType, signal) {
        const input = {
            ...this.createBaseInput(HookEventName.SessionStart),
            permission_mode: permissionMode ?? PermissionMode.Default,
            source,
            model,
            agent_type: agentType
        };
        // Pass source as context for matcher filtering
        return this.executeHooks(HookEventName.SessionStart, input, {
            trigger: source
        }, signal);
    }
    /**
     * Fire a SessionEnd event
     * Called when a session ends
     */
    async fireSessionEndEvent(reason, signal) {
        const input = {
            ...this.createBaseInput(HookEventName.SessionEnd),
            reason
        };
        // Pass reason as context for matcher filtering
        return this.executeHooks(HookEventName.SessionEnd, input, {
            trigger: reason
        }, signal);
    }
    /**
     * Fire a PreToolUse event
     * Called before tool execution begins
     */
    async firePreToolUseEvent(toolName, toolInput, toolUseId, permissionMode, signal) {
        const input = {
            ...this.createBaseInput(HookEventName.PreToolUse),
            permission_mode: permissionMode,
            tool_name: toolName,
            tool_input: toolInput,
            tool_use_id: toolUseId
        };
        // Pass tool name as context for matcher filtering
        return this.executeHooks(HookEventName.PreToolUse, input, {
            toolName
        }, signal);
    }
    /**
     * Fire a PostToolUse event
     * Called after successful tool execution
     */
    async firePostToolUseEvent(toolName, toolInput, toolResponse, toolUseId, permissionMode, signal) {
        const input = {
            ...this.createBaseInput(HookEventName.PostToolUse),
            permission_mode: permissionMode,
            tool_name: toolName,
            tool_input: toolInput,
            tool_response: toolResponse,
            tool_use_id: toolUseId
        };
        // Pass tool name as context for matcher filtering
        return this.executeHooks(HookEventName.PostToolUse, input, {
            toolName
        }, signal);
    }
    /**
     * Fire a PostToolUseFailure event
     * Called when tool execution fails
     */
    async firePostToolUseFailureEvent(toolUseId, toolName, toolInput, errorMessage, isInterrupt, permissionMode, signal) {
        const input = {
            ...this.createBaseInput(HookEventName.PostToolUseFailure),
            permission_mode: permissionMode ?? PermissionMode.Default,
            tool_use_id: toolUseId,
            tool_name: toolName,
            tool_input: toolInput,
            error: errorMessage,
            is_interrupt: isInterrupt
        };
        // Pass tool name as context for matcher filtering
        return this.executeHooks(HookEventName.PostToolUseFailure, input, {
            toolName
        }, signal);
    }
    /**
     * Fire a PreCompact event
     * Called before conversation compaction begins
     */
    async firePreCompactEvent(trigger, customInstructions = '', signal) {
        const input = {
            ...this.createBaseInput(HookEventName.PreCompact),
            trigger,
            custom_instructions: customInstructions
        };
        // Pass trigger as context for matcher filtering
        return this.executeHooks(HookEventName.PreCompact, input, {
            trigger
        }, signal);
    }
    /**
     * Fire a Notification event
     */
    async fireNotificationEvent(message, notificationType, title, signal) {
        const input = {
            ...this.createBaseInput(HookEventName.Notification),
            message,
            notification_type: notificationType,
            title
        };
        // Pass notification_type as context for matcher filtering
        return this.executeHooks(HookEventName.Notification, input, {
            notificationType
        }, signal);
    }
    /**
     * Fire a PermissionRequest event
     * Called when a permission dialog is about to be shown to the user
     */
    async firePermissionRequestEvent(toolName, toolInput, permissionMode, permissionSuggestions, signal) {
        const input = {
            ...this.createBaseInput(HookEventName.PermissionRequest),
            permission_mode: permissionMode,
            tool_name: toolName,
            tool_input: toolInput,
            permission_suggestions: permissionSuggestions
        };
        // Pass tool name as context for matcher filtering
        return this.executeHooks(HookEventName.PermissionRequest, input, {
            toolName
        }, signal);
    }
    /**
     * Fire a SubagentStart event
     * Called when a subagent is spawned via the Agent tool
     */
    async fireSubagentStartEvent(agentId, agentType, permissionMode, signal) {
        const input = {
            ...this.createBaseInput(HookEventName.SubagentStart),
            permission_mode: permissionMode,
            agent_id: agentId,
            agent_type: agentType
        };
        // Pass agentType as context for matcher filtering
        return this.executeHooks(HookEventName.SubagentStart, input, {
            agentType: String(agentType)
        }, signal);
    }
    /**
     * Fire a SubagentStop event
     * Called when a subagent has finished responding
     */
    async fireSubagentStopEvent(agentId, agentType, agentTranscriptPath, lastAssistantMessage, stopHookActive, permissionMode, signal) {
        const input = {
            ...this.createBaseInput(HookEventName.SubagentStop),
            permission_mode: permissionMode,
            stop_hook_active: stopHookActive,
            agent_id: agentId,
            agent_type: agentType,
            agent_transcript_path: agentTranscriptPath,
            last_assistant_message: lastAssistantMessage
        };
        // Pass agentType as context for matcher filtering
        return this.executeHooks(HookEventName.SubagentStop, input, {
            agentType: String(agentType)
        }, signal);
    }
    /**
     * Execute hooks for a specific event (direct execution without MessageBus)
     * Used as fallback when MessageBus is not available
     */
    async executeHooks(eventName, input, context, signal) {
        try {
            // Create execution plan
            const plan = this.hookPlanner.createExecutionPlan(eventName, context);
            if (!plan || plan.hookConfigs.length === 0) {
                return {
                    success: true,
                    allOutputs: [],
                    errors: [],
                    totalDuration: 0
                };
            }
            const onHookStart = (config, index) => {
                const hookName = this.getHookName(config);
                debugLogger.debug(`Hook ${hookName} started for event ${eventName} (${index + 1}/${plan.hookConfigs.length})`);
            };
            const onHookEnd = (config, result) => {
                const hookName = this.getHookName(config);
                debugLogger.debug(`Hook ${hookName} ended for event ${eventName}: ${result.success ? 'success' : 'failed'}`);
            };
            // Execute hooks according to the plan's strategy
            const results = plan.sequential
                ? await this.hookRunner.executeHooksSequential(plan.hookConfigs, eventName, input, onHookStart, onHookEnd, signal)
                : await this.hookRunner.executeHooksParallel(plan.hookConfigs, eventName, input, onHookStart, onHookEnd, signal);
            // Aggregate results
            const aggregated = this.hookAggregator.aggregateResults(results, eventName);
            // Process common hook output fields centrally
            this.processCommonHookOutputFields(aggregated);
            // Log hook execution for telemetry
            this.logHookExecution(eventName, input, results, aggregated);
            return aggregated;
        }
        catch (error) {
            debugLogger.error(`Hook event bus error for ${eventName}: ${error}`);
            return {
                success: false,
                allOutputs: [],
                errors: [
                    error instanceof Error ? error : new Error(String(error))
                ],
                totalDuration: 0
            };
        }
    }
    /**
     * Create base hook input with common fields
     */
    createBaseInput(eventName) {
        // Get the transcript path from the Config
        const transcriptPath = this.config.getTranscriptPath();
        return {
            session_id: this.config.getSessionId(),
            transcript_path: transcriptPath,
            cwd: this.config.getWorkingDir(),
            hook_event_name: eventName,
            timestamp: new Date().toISOString()
        };
    }
    /**
     * Process common hook output fields centrally
     */
    processCommonHookOutputFields(aggregated) {
        if (!aggregated.finalOutput) {
            return;
        }
        // Handle systemMessage - show to user in transcript mode (not to agent)
        const systemMessage = aggregated.finalOutput.systemMessage;
        if (systemMessage && !aggregated.finalOutput.suppressOutput) {
            debugLogger.warn(`Hook system message: ${systemMessage}`);
        }
        // Handle continue=false - this should stop the entire agent execution
        if (aggregated.finalOutput.continue === false) {
            const stopReason = aggregated.finalOutput.stopReason ||
                aggregated.finalOutput.reason ||
                'No reason provided';
            debugLogger.debug(`Hook requested to stop execution: ${stopReason}`);
        }
    }
    /**
     * Log hook execution for observability
     */
    logHookExecution(eventName, input, results, aggregated) {
        const failedHooks = results.filter((r) => !r.success);
        const successCount = results.length - failedHooks.length;
        const errorCount = failedHooks.length;
        if (errorCount > 0) {
            const failedNames = failedHooks
                .map((r) => this.getHookNameFromResult(r))
                .join(', ');
            debugLogger.warn(`Hook(s) [${failedNames}] failed for event ${eventName}. Check debug logs for more details.`);
        }
        else {
            debugLogger.debug(`Hook execution for ${eventName}: ${successCount} hooks executed successfully, ` +
                `total duration: ${aggregated.totalDuration}ms`);
        }
        for (const result of results) {
            const hookName = this.getHookNameFromResult(result);
            const hookType = this.getHookTypeFromResult(result);
            const hookCallEvent = new HookCallEvent(eventName, hookType, hookName, { ...input }, result.duration, result.success, result.output ? { ...result.output } : undefined, result.exitCode, result.stdout, result.stderr, result.error?.message);
            logHookCall(this.config, hookCallEvent);
        }
        for (const error of aggregated.errors) {
            debugLogger.warn(`Hook execution error: ${error.message}`);
        }
    }
    /**
     * Get hook name from config for display or telemetry
     */
    getHookName(config) {
        if (config.type === 'command') {
            return config.name || config.command || 'unknown-command';
        }
        return config.name || 'unknown-hook';
    }
    /**
     * Get hook name from execution result for telemetry
     */
    getHookNameFromResult(result) {
        return this.getHookName(result.hookConfig);
    }
    /**
     * Get hook type from execution result for telemetry
     */
    getHookTypeFromResult(result) {
        return result.hookConfig.type;
    }
}
//# sourceMappingURL=hookEventHandler.js.map