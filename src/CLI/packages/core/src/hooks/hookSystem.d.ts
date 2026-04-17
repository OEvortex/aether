/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
import { type AggregatedHookResult } from './hookAggregator.js';
import { HookEventHandler } from './hookEventHandler.js';
import type { HookRegistryEntry } from './hookRegistry.js';
import { HookRegistry } from './hookRegistry.js';
import type { AgentType, DefaultHookOutput, NotificationType, PermissionMode, PermissionSuggestion, PreCompactTrigger, SessionEndReason, SessionStartSource } from './types.js';
/**
 * Main hook system that coordinates all hook-related functionality
 */
export declare class HookSystem {
    private readonly hookRegistry;
    private readonly hookRunner;
    private readonly hookAggregator;
    private readonly hookPlanner;
    private readonly hookEventHandler;
    constructor(config: Config);
    /**
     * Initialize the hook system
     */
    initialize(): Promise<void>;
    /**
     * Get the hook event bus for firing events
     */
    getEventHandler(): HookEventHandler;
    /**
     * Get hook registry for management operations
     */
    getRegistry(): HookRegistry;
    /**
     * Enable or disable a hook
     */
    setHookEnabled(hookName: string, enabled: boolean): void;
    /**
     * Get all registered hooks for display/management
     */
    getAllHooks(): HookRegistryEntry[];
    /**
     * Check if there are any enabled hooks registered for a specific event.
     * This is a fast-path check to avoid expensive MessageBus round-trips
     * when no hooks are configured for a given event.
     */
    hasHooksForEvent(eventName: string): boolean;
    fireUserPromptSubmitEvent(prompt: string, signal?: AbortSignal): Promise<DefaultHookOutput | undefined>;
    fireStopEvent(stopHookActive?: boolean, lastAssistantMessage?: string, signal?: AbortSignal): Promise<AggregatedHookResult>;
    fireSessionStartEvent(source: SessionStartSource, model: string, permissionMode?: PermissionMode, agentType?: AgentType, signal?: AbortSignal): Promise<DefaultHookOutput | undefined>;
    fireSessionEndEvent(reason: SessionEndReason, signal?: AbortSignal): Promise<DefaultHookOutput | undefined>;
    /**
     * Fire a PreToolUse event - called before tool execution
     */
    firePreToolUseEvent(toolName: string, toolInput: Record<string, unknown>, toolUseId: string, permissionMode: PermissionMode, signal?: AbortSignal): Promise<DefaultHookOutput | undefined>;
    /**
     * Fire a PostToolUse event - called after successful tool execution
     */
    firePostToolUseEvent(toolName: string, toolInput: Record<string, unknown>, toolResponse: Record<string, unknown>, toolUseId: string, permissionMode: PermissionMode, signal?: AbortSignal): Promise<DefaultHookOutput | undefined>;
    /**
     * Fire a PostToolUseFailure event - called when tool execution fails
     */
    firePostToolUseFailureEvent(toolUseId: string, toolName: string, toolInput: Record<string, unknown>, errorMessage: string, isInterrupt?: boolean, permissionMode?: PermissionMode, signal?: AbortSignal): Promise<DefaultHookOutput | undefined>;
    /**
     * Fire a PreCompact event - called before conversation compaction
     */
    firePreCompactEvent(trigger: PreCompactTrigger, customInstructions?: string, signal?: AbortSignal): Promise<DefaultHookOutput | undefined>;
    /**
     * Fire a Notification event
     */
    fireNotificationEvent(message: string, notificationType: NotificationType, title?: string, signal?: AbortSignal): Promise<DefaultHookOutput | undefined>;
    /**
     * Fire a SubagentStart event - called when a subagent is spawned
     */
    fireSubagentStartEvent(agentId: string, agentType: AgentType | string, permissionMode: PermissionMode, signal?: AbortSignal): Promise<DefaultHookOutput | undefined>;
    /**
     * Fire a SubagentStop event - called when a subagent finishes
     */
    fireSubagentStopEvent(agentId: string, agentType: AgentType | string, agentTranscriptPath: string, lastAssistantMessage: string, stopHookActive: boolean, permissionMode: PermissionMode, signal?: AbortSignal): Promise<DefaultHookOutput | undefined>;
    /**
     * Fire a PermissionRequest event
     */
    firePermissionRequestEvent(toolName: string, toolInput: Record<string, unknown>, permissionMode: PermissionMode, permissionSuggestions?: PermissionSuggestion[], signal?: AbortSignal): Promise<DefaultHookOutput | undefined>;
}
