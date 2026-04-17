/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
import type { SkillManager } from '../skills/skill-manager.js';
import type { ToolResult, ToolResultDisplay } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation } from './tools.js';
export interface SkillParams {
    skill: string;
}
/**
 * Builds the LLM-facing content string when a skill body is injected.
 * Shared between SkillToolInvocation (runtime) and /context (estimation)
 * so that token estimates stay in sync with actual usage.
 */
export declare function buildSkillLlmContent(baseDir: string, body: string): string;
/**
 * Skill tool that enables the model to access skill definitions.
 * The tool dynamically loads available skills and includes them in its description
 * for the model to choose from.
 */
export declare class SkillTool extends BaseDeclarativeTool<SkillParams, ToolResult> {
    private readonly config;
    static readonly Name: string;
    private skillManager;
    private availableSkills;
    private loadedSkillNames;
    constructor(config: Config);
    /**
     * Asynchronously initializes the tool by loading available skills
     * and updating the description and schema.
     */
    refreshSkills(): Promise<void>;
    /**
     * Updates the tool's description and schema based on available skills.
     */
    private updateDescriptionAndSchema;
    validateToolParams(params: SkillParams): string | null;
    protected createInvocation(params: SkillParams): SkillToolInvocation;
    getAvailableSkillNames(): string[];
    /**
     * Returns the set of skill names that have been successfully loaded
     * (invoked) during the current session. Used by /context to attribute
     * loaded skill body tokens separately from the tool-definition cost.
     */
    getLoadedSkillNames(): ReadonlySet<string>;
    /**
     * Clears the loaded-skills tracking. Should be called when the session
     * is reset (e.g. /clear) so that stale body-token data is not shown.
     */
    clearLoadedSkills(): void;
}
declare class SkillToolInvocation extends BaseToolInvocation<SkillParams, ToolResult> {
    private readonly config;
    private readonly skillManager;
    private readonly onSkillLoaded;
    constructor(config: Config, skillManager: SkillManager, params: SkillParams, onSkillLoaded: (name: string) => void);
    getDescription(): string;
    execute(_signal?: AbortSignal, _updateOutput?: (output: ToolResultDisplay) => void): Promise<ToolResult>;
}
export {};
