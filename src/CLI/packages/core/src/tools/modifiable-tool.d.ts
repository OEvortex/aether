/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { EditorType } from '../utils/editor.js';
import type { AnyDeclarativeTool, DeclarativeTool, ToolResult } from './tools.js';
/**
 * A declarative tool that supports a modify operation.
 */
export interface ModifiableDeclarativeTool<TParams extends object> extends DeclarativeTool<TParams, ToolResult> {
    getModifyContext(abortSignal: AbortSignal): ModifyContext<TParams>;
}
export interface ModifyContext<ToolParams> {
    getFilePath: (params: ToolParams) => string;
    getCurrentContent: (params: ToolParams) => Promise<string>;
    getProposedContent: (params: ToolParams) => Promise<string>;
    createUpdatedParams: (oldContent: string, modifiedProposedContent: string, originalParams: ToolParams) => ToolParams;
}
export interface ModifyResult<ToolParams> {
    updatedParams: ToolParams;
    updatedDiff: string;
}
/**
 * Type guard to check if a declarative tool is modifiable.
 */
export declare function isModifiableDeclarativeTool(tool: AnyDeclarativeTool): tool is ModifiableDeclarativeTool<object>;
/**
 * Triggers an external editor for the user to modify the proposed content,
 * and returns the updated tool parameters and the diff after the user has modified the proposed content.
 */
export declare function modifyWithEditor<ToolParams>(originalParams: ToolParams, modifyContext: ModifyContext<ToolParams>, editorType: EditorType, _abortSignal: AbortSignal, onEditorClose: () => void): Promise<ModifyResult<ToolParams>>;
