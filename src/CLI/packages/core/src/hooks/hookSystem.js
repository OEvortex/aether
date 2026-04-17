/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import { createDebugLogger } from '../utils/debugLogger.js';
import { HookAggregator } from './hookAggregator.js';
import { HookEventHandler } from './hookEventHandler.js';
import { HookPlanner } from './hookPlanner.js';
import { HookRegistry } from './hookRegistry.js';
import { HookRunner } from './hookRunner.js';
import { createHookOutput } from './types.js';
const debugLogger = createDebugLogger('TRUSTED_HOOKS');
/**
 * Main hook system that coordinates all hook-related functionality
 */
export class HookSystem {
    hookRegistry;
    hookRunner;
    hookAggregator;
    hookPlanner;
    hookEventHandler;
    constructor(config) {
        // Initialize components
        this.hookRegistry = new HookRegistry(config);
        this.hookRunner = new HookRunner();
        this.hookAggregator = new HookAggregator();
        this.hookPlanner = new HookPlanner(this.hookRegistry);
        this.hookEventHandler = new HookEventHandler(config, this.hookPlanner, this.hookRunner, this.hookAggregator);
    }
    /**
     * Initialize the hook system
     */
    async initialize() {
        await this.hookRegistry.initialize();
        debugLogger.debug('Hook system initialized successfully');
    }
    /**
     * Get the hook event bus for firing events
     */
    getEventHandler() {
        return this.hookEventHandler;
    }
    /**
     * Get hook registry for management operations
     */
    getRegistry() {
        return this.hookRegistry;
    }
    /**
     * Enable or disable a hook
     */
    setHookEnabled(hookName, enabled) {
        this.hookRegistry.setHookEnabled(hookName, enabled);
    }
    /**
     * Get all registered hooks for display/management
     */
    getAllHooks() {
        return this.hookRegistry.getAllHooks();
    }
    /**
     * Check if there are any enabled hooks registered for a specific event.
     * This is a fast-path check to avoid expensive MessageBus round-trips
     * when no hooks are configured for a given event.
     */
    hasHooksForEvent(eventName) {
        return (this.hookRegistry.getHooksForEvent(eventName)
            .length > 0);
    }
    async fireUserPromptSubmitEvent(prompt, signal) {
        const result = await this.hookEventHandler.fireUserPromptSubmitEvent(prompt, signal);
        return result.finalOutput
            ? createHookOutput('UserPromptSubmit', result.finalOutput)
            : undefined;
    }
    async fireStopEvent(stopHookActive = false, lastAssistantMessage = '', signal) {
        return this.hookEventHandler.fireStopEvent(stopHookActive, lastAssistantMessage, signal);
    }
    async fireSessionStartEvent(source, model, permissionMode, agentType, signal) {
        const result = await this.hookEventHandler.fireSessionStartEvent(source, model, permissionMode, agentType, signal);
        return result.finalOutput
            ? createHookOutput('SessionStart', result.finalOutput)
            : undefined;
    }
    async fireSessionEndEvent(reason, signal) {
        const result = await this.hookEventHandler.fireSessionEndEvent(reason, signal);
        return result.finalOutput
            ? createHookOutput('SessionEnd', result.finalOutput)
            : undefined;
    }
    /**
     * Fire a PreToolUse event - called before tool execution
     */
    async firePreToolUseEvent(toolName, toolInput, toolUseId, permissionMode, signal) {
        const result = await this.hookEventHandler.firePreToolUseEvent(toolName, toolInput, toolUseId, permissionMode, signal);
        return result.finalOutput
            ? createHookOutput('PreToolUse', result.finalOutput)
            : undefined;
    }
    /**
     * Fire a PostToolUse event - called after successful tool execution
     */
    async firePostToolUseEvent(toolName, toolInput, toolResponse, toolUseId, permissionMode, signal) {
        const result = await this.hookEventHandler.firePostToolUseEvent(toolName, toolInput, toolResponse, toolUseId, permissionMode, signal);
        return result.finalOutput
            ? createHookOutput('PostToolUse', result.finalOutput)
            : undefined;
    }
    /**
     * Fire a PostToolUseFailure event - called when tool execution fails
     */
    async firePostToolUseFailureEvent(toolUseId, toolName, toolInput, errorMessage, isInterrupt, permissionMode, signal) {
        const result = await this.hookEventHandler.firePostToolUseFailureEvent(toolUseId, toolName, toolInput, errorMessage, isInterrupt, permissionMode, signal);
        return result.finalOutput
            ? createHookOutput('PostToolUseFailure', result.finalOutput)
            : undefined;
    }
    /**
     * Fire a PreCompact event - called before conversation compaction
     */
    async firePreCompactEvent(trigger, customInstructions = '', signal) {
        const result = await this.hookEventHandler.firePreCompactEvent(trigger, customInstructions, signal);
        return result.finalOutput
            ? createHookOutput('PreCompact', result.finalOutput)
            : undefined;
    }
    /**
     * Fire a Notification event
     */
    async fireNotificationEvent(message, notificationType, title, signal) {
        const result = await this.hookEventHandler.fireNotificationEvent(message, notificationType, title, signal);
        return result.finalOutput
            ? createHookOutput('Notification', result.finalOutput)
            : undefined;
    }
    /**
     * Fire a SubagentStart event - called when a subagent is spawned
     */
    async fireSubagentStartEvent(agentId, agentType, permissionMode, signal) {
        const result = await this.hookEventHandler.fireSubagentStartEvent(agentId, agentType, permissionMode, signal);
        return result.finalOutput
            ? createHookOutput('SubagentStart', result.finalOutput)
            : undefined;
    }
    /**
     * Fire a SubagentStop event - called when a subagent finishes
     */
    async fireSubagentStopEvent(agentId, agentType, agentTranscriptPath, lastAssistantMessage, stopHookActive, permissionMode, signal) {
        const result = await this.hookEventHandler.fireSubagentStopEvent(agentId, agentType, agentTranscriptPath, lastAssistantMessage, stopHookActive, permissionMode, signal);
        return result.finalOutput
            ? createHookOutput('SubagentStop', result.finalOutput)
            : undefined;
    }
    /**
     * Fire a PermissionRequest event
     */
    async firePermissionRequestEvent(toolName, toolInput, permissionMode, permissionSuggestions, signal) {
        const result = await this.hookEventHandler.firePermissionRequestEvent(toolName, toolInput, permissionMode, permissionSuggestions, signal);
        return result.finalOutput
            ? createHookOutput('PermissionRequest', result.finalOutput)
            : undefined;
    }
}
//# sourceMappingURL=hookSystem.js.map