/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
import type { ModifiableDeclarativeTool, ModifyContext } from './modifiable-tool.js';
import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool } from './tools.js';
export declare function applyReplacement(currentContent: string | null, oldString: string, newString: string, isNewFile: boolean): string;
/**
 * Parameters for the Edit tool
 */
export interface EditToolParams {
    /**
     * The absolute path to the file to modify
     */
    file_path: string;
    /**
     * The text to replace
     */
    old_string: string;
    /**
     * The text to replace it with
     */
    new_string: string;
    /**
     * Replace every occurrence of old_string instead of requiring a unique match.
     */
    replace_all?: boolean;
    /**
     * Whether the edit was modified manually by the user.
     */
    modified_by_user?: boolean;
    /**
     * Initially proposed content.
     */
    ai_proposed_content?: string;
}
/**
 * Implementation of the Edit tool logic
 */
export declare class EditTool extends BaseDeclarativeTool<EditToolParams, ToolResult> implements ModifiableDeclarativeTool<EditToolParams> {
    private readonly config;
    static readonly Name: "edit";
    constructor(config: Config);
    /**
     * Validates the parameters for the Edit tool
     * @param params Parameters to validate
     * @returns Error message string or null if valid
     */
    protected validateToolParamValues(params: EditToolParams): string | null;
    protected createInvocation(params: EditToolParams): ToolInvocation<EditToolParams, ToolResult>;
    getModifyContext(_: AbortSignal): ModifyContext<EditToolParams>;
}
