/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import { AgentEventEmitter } from '../agents/runtime/agent-events.js';
import type { Config } from '../config/config.js';
import type { SubagentManager } from '../subagents/subagent-manager.js';
import type { ToolResult, ToolResultDisplay } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation } from './tools.js';
export interface AgentParams {
    description: string;
    prompt: string;
    subagent_type: string;
}
/**
 * Agent tool that enables primary agents to delegate tasks to specialized agents.
 * The tool dynamically loads available agents and includes them in its description
 * for the model to choose from.
 */
export declare class AgentTool extends BaseDeclarativeTool<AgentParams, ToolResult> {
    private readonly config;
    static readonly Name: string;
    private subagentManager;
    private availableSubagents;
    private readonly removeChangeListener;
    constructor(config: Config);
    dispose(): void;
    /**
     * Asynchronously initializes the tool by loading available subagents
     * and updating the description and schema.
     */
    refreshSubagents(): Promise<void>;
    /**
     * Updates the tool's description and schema based on available subagents.
     */
    private updateDescriptionAndSchema;
    validateToolParams(params: AgentParams): string | null;
    protected createInvocation(params: AgentParams): AgentToolInvocation;
    getAvailableSubagentNames(): string[];
}
declare class AgentToolInvocation extends BaseToolInvocation<AgentParams, ToolResult> {
    private readonly config;
    private readonly subagentManager;
    readonly eventEmitter: AgentEventEmitter;
    private currentDisplay;
    private currentToolCalls;
    constructor(config: Config, subagentManager: SubagentManager, params: AgentParams);
    /**
     * Updates the current display state and calls updateOutput if provided
     */
    private updateDisplay;
    /**
     * Sets up event listeners for real-time subagent progress updates
     */
    private setupEventListeners;
    getDescription(): string;
    execute(signal?: AbortSignal, updateOutput?: (output: ToolResultDisplay) => void): Promise<ToolResult>;
}
export {};
