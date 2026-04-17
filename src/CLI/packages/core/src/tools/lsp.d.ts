/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
import type { LspCallHierarchyItem, LspCodeActionKind, LspDiagnostic } from '../lsp/types.js';
import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool } from './tools.js';
/**
 * Supported LSP operations.
 */
export type LspOperation = 'goToDefinition' | 'findReferences' | 'hover' | 'documentSymbol' | 'workspaceSymbol' | 'goToImplementation' | 'prepareCallHierarchy' | 'incomingCalls' | 'outgoingCalls' | 'diagnostics' | 'workspaceDiagnostics' | 'codeActions';
/**
 * Parameters for the unified LSP tool.
 */
export interface LspToolParams {
    /** Operation to perform. */
    operation: LspOperation;
    /** File path (absolute or workspace-relative). */
    filePath?: string;
    /** 1-based line number when targeting a specific file location. */
    line?: number;
    /** 1-based character/column number when targeting a specific file location. */
    character?: number;
    /** End line for range-based operations (1-based). */
    endLine?: number;
    /** End character for range-based operations (1-based). */
    endCharacter?: number;
    /** Whether to include the declaration in reference results. */
    includeDeclaration?: boolean;
    /** Query string for workspace symbol search. */
    query?: string;
    /** Call hierarchy item from a previous call hierarchy operation. */
    callHierarchyItem?: LspCallHierarchyItem;
    /** Optional server name override. */
    serverName?: string;
    /** Optional maximum number of results. */
    limit?: number;
    /** Diagnostics for code action context. */
    diagnostics?: LspDiagnostic[];
    /** Code action kinds to filter by. */
    codeActionKinds?: LspCodeActionKind[];
}
/**
 * Unified LSP tool that supports multiple operations:
 * - goToDefinition: Find where a symbol is defined
 * - findReferences: Find all references to a symbol
 * - hover: Get hover information (documentation, type info)
 * - documentSymbol: Get all symbols in a document
 * - workspaceSymbol: Search for symbols across the workspace
 * - goToImplementation: Find implementations of an interface or abstract method
 * - prepareCallHierarchy: Get call hierarchy item at a position
 * - incomingCalls: Find all functions that call the given function
 * - outgoingCalls: Find all functions called by the given function
 * - diagnostics: Get diagnostic messages (errors, warnings) for a file
 * - workspaceDiagnostics: Get all diagnostic messages across the workspace
 * - codeActions: Get available code actions (quick fixes, refactorings) at a location
 */
export declare class LspTool extends BaseDeclarativeTool<LspToolParams, ToolResult> {
    private readonly config;
    static readonly Name: "lsp";
    constructor(config: Config);
    protected validateToolParamValues(params: LspToolParams): string | null;
    protected createInvocation(params: LspToolParams): ToolInvocation<LspToolParams, ToolResult>;
}
