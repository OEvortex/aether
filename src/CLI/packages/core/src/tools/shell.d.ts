/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
import type { PermissionDecision } from '../permissions/types.js';
import type { ShellExecutionConfig } from '../services/shellExecutionService.js';
import type { ToolCallConfirmationDetails, ToolInvocation, ToolResult, ToolResultDisplay } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation } from './tools.js';
export declare const OUTPUT_UPDATE_INTERVAL_MS = 1000;
export interface ShellToolParams {
    command: string;
    is_background: boolean;
    timeout?: number;
    description?: string;
    directory?: string;
}
export declare class ShellToolInvocation extends BaseToolInvocation<ShellToolParams, ToolResult> {
    private readonly config;
    constructor(config: Config, params: ShellToolParams);
    getDescription(): string;
    /**
     * AST-based permission check for the shell command.
     * - Read-only commands (via AST analysis) → 'allow'
     * - All other commands → 'ask'
     */
    getDefaultPermission(): Promise<PermissionDecision>;
    /**
     * Constructs confirmation dialog details for a shell command that needs
     * user approval.  For compound commands (e.g. `cd foo && npm run build`),
     * sub-commands that are already allowed (read-only) are excluded from both
     * the displayed root-command list and the suggested permission rules.
     */
    getConfirmationDetails(_abortSignal: AbortSignal): Promise<ToolCallConfirmationDetails>;
    execute(signal: AbortSignal, updateOutput?: (output: ToolResultDisplay) => void, shellExecutionConfig?: ShellExecutionConfig, setPidCallback?: (pid: number) => void): Promise<ToolResult>;
    private addCoAuthorToGitCommit;
}
export declare class ShellTool extends BaseDeclarativeTool<ShellToolParams, ToolResult> {
    private readonly config;
    static Name: string;
    constructor(config: Config);
    protected validateToolParamValues(params: ShellToolParams): string | null;
    protected createInvocation(params: ShellToolParams): ToolInvocation<ShellToolParams, ToolResult>;
}
