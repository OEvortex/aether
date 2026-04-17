/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { PermissionDecision } from '../permissions/types.js';
import type { ModifiableDeclarativeTool, ModifyContext } from '../tools/modifiable-tool.js';
import type { ToolCallConfirmationDetails, ToolInvocation, ToolResult } from '../tools/tools.js';
import { BaseDeclarativeTool, BaseToolInvocation } from '../tools/tools.js';
interface MockToolOptions {
    name: string;
    displayName?: string;
    description?: string;
    canUpdateOutput?: boolean;
    isOutputMarkdown?: boolean;
    getDefaultPermission?: () => Promise<PermissionDecision>;
    getConfirmationDetails?: (signal: AbortSignal) => Promise<ToolCallConfirmationDetails>;
    execute?: (params: {
        [key: string]: unknown;
    }, signal?: AbortSignal, updateOutput?: (output: string) => void) => Promise<ToolResult>;
    params?: object;
}
/**
 * A highly configurable mock tool for testing purposes.
 */
export declare class MockTool extends BaseDeclarativeTool<{
    [key: string]: unknown;
}, ToolResult> {
    getDefaultPermission: () => Promise<PermissionDecision>;
    getConfirmationDetails: (signal: AbortSignal) => Promise<ToolCallConfirmationDetails>;
    execute: (params: {
        [key: string]: unknown;
    }, signal?: AbortSignal, updateOutput?: (output: string) => void) => Promise<ToolResult>;
    constructor(options: MockToolOptions);
    protected createInvocation(params: {
        [key: string]: unknown;
    }): ToolInvocation<{
        [key: string]: unknown;
    }, ToolResult>;
}
export declare const MOCK_TOOL_GET_DEFAULT_PERMISSION: () => Promise<PermissionDecision>;
export declare const MOCK_TOOL_GET_CONFIRMATION_DETAILS: () => Promise<{
    type: "exec";
    title: string;
    command: string;
    rootCommand: string;
    onConfirm: () => Promise<void>;
}>;
export declare class MockModifiableToolInvocation extends BaseToolInvocation<Record<string, unknown>, ToolResult> {
    private readonly tool;
    constructor(tool: MockModifiableTool, params: Record<string, unknown>);
    execute(_abortSignal: AbortSignal): Promise<ToolResult>;
    getDefaultPermission(): Promise<PermissionDecision>;
    getConfirmationDetails(_abortSignal: AbortSignal): Promise<ToolCallConfirmationDetails>;
    getDescription(): string;
}
/**
 * Configurable mock modifiable tool for testing.
 */
export declare class MockModifiableTool extends BaseDeclarativeTool<Record<string, unknown>, ToolResult> implements ModifiableDeclarativeTool<Record<string, unknown>> {
    executeFn: (params: Record<string, unknown>) => ToolResult | undefined;
    shouldConfirm: boolean;
    constructor(name?: string);
    getModifyContext(_abortSignal: AbortSignal): ModifyContext<Record<string, unknown>>;
    protected createInvocation(params: Record<string, unknown>): ToolInvocation<Record<string, unknown>, ToolResult>;
}
export {};
