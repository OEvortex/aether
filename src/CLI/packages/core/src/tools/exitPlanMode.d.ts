/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
import type { PermissionDecision } from '../permissions/types.js';
import type { ToolPlanConfirmationDetails, ToolResult } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation } from './tools.js';
export interface ExitPlanModeParams {
    plan: string;
}
declare class ExitPlanModeToolInvocation extends BaseToolInvocation<ExitPlanModeParams, ToolResult> {
    private readonly config;
    private wasApproved;
    constructor(config: Config, params: ExitPlanModeParams);
    getDescription(): string;
    /**
     * Plan mode exit always requires user confirmation.
     */
    getDefaultPermission(): Promise<PermissionDecision>;
    getConfirmationDetails(_abortSignal: AbortSignal): Promise<ToolPlanConfirmationDetails>;
    private setApprovalModeSafely;
    execute(_signal: AbortSignal): Promise<ToolResult>;
}
export declare class ExitPlanModeTool extends BaseDeclarativeTool<ExitPlanModeParams, ToolResult> {
    private readonly config;
    static readonly Name: string;
    constructor(config: Config);
    validateToolParams(params: ExitPlanModeParams): string | null;
    protected createInvocation(params: ExitPlanModeParams): ExitPlanModeToolInvocation;
}
export {};
