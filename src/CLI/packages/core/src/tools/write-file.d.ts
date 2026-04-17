/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
import type { ModifiableDeclarativeTool, ModifyContext } from './modifiable-tool.js';
import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool } from './tools.js';
/**
 * Parameters for the WriteFile tool
 */
export interface WriteFileToolParams {
    /**
     * The absolute path to the file to write to
     */
    file_path: string;
    /**
     * The content to write to the file
     */
    content: string;
    /**
     * Whether the proposed content was modified by the user.
     */
    modified_by_user?: boolean;
    /**
     * Initially proposed content.
     */
    ai_proposed_content?: string;
}
/**
 * Implementation of the WriteFile tool logic
 */
export declare class WriteFileTool extends BaseDeclarativeTool<WriteFileToolParams, ToolResult> implements ModifiableDeclarativeTool<WriteFileToolParams> {
    private readonly config;
    static readonly Name: string;
    constructor(config: Config);
    protected validateToolParamValues(params: WriteFileToolParams): string | null;
    protected createInvocation(params: WriteFileToolParams): ToolInvocation<WriteFileToolParams, ToolResult>;
    getModifyContext(_abortSignal: AbortSignal): ModifyContext<WriteFileToolParams>;
}
