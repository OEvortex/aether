/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import type { HookRegistry } from './hookRegistry.js';
import type { HookExecutionPlan } from './types.js';
import { HookEventName } from './types.js';
/**
 * Hook planner that selects matching hooks and creates execution plans
 */
export declare class HookPlanner {
    private readonly hookRegistry;
    constructor(hookRegistry: HookRegistry);
    /**
     * Create execution plan for a hook event
     */
    createExecutionPlan(eventName: HookEventName, context?: HookEventContext): HookExecutionPlan | null;
    /**
     * Check if a hook entry matches the given context.
     * Uses explicit event-based dispatch to avoid ambiguity between events
     * that share similar context fields (e.g., SessionStart and SubagentStart
     * both have agentType, but use different matcher semantics).
     */
    private matchesContext;
    /**
     * Match notification type against matcher pattern
     */
    private matchesNotificationType;
    /**
     * Match session source or end reason against matcher pattern
     */
    private matchesSessionTrigger;
    /**
     * Match tool name against matcher pattern
     */
    private matchesToolName;
    /**
     * Match trigger/source against matcher pattern
     */
    private matchesTrigger;
    /**
     * Match agent type against matcher pattern.
     * Supports regex matching, same as tool name matching.
     */
    private matchesAgentType;
    /**
     * Deduplicate identical hook configurations
     */
    private deduplicateHooks;
}
/**
 * Context information for hook event matching
 */
export interface HookEventContext {
    toolName?: string;
    trigger?: string;
    notificationType?: string;
    /** Agent type for SubagentStart/SubagentStop matcher filtering */
    agentType?: string;
}
