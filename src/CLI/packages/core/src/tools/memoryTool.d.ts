/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { PermissionDecision } from '../permissions/types.js';
import type { ModifiableDeclarativeTool, ModifyContext } from './modifiable-tool.js';
import type { ToolCallConfirmationDetails, ToolResult } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation } from './tools.js';
export declare const AETHER_CONFIG_DIR = ".aether";
export declare const DEFAULT_CONTEXT_FILENAME = "AGENTS.md";
export declare const AGENT_CONTEXT_FILENAME = "AGENTS.md";
export declare const MEMORY_SECTION_HEADER = "## Aether Added Memories";
export declare function setGeminiMdFilename(newFilename: string | string[]): void;
export declare function getCurrentGeminiMdFilename(): string;
export declare function getAllGeminiMdFilenames(): string[];
interface SaveMemoryParams {
    fact: string;
    modified_by_user?: boolean;
    modified_content?: string;
    scope?: 'global' | 'project';
}
declare class MemoryToolInvocation extends BaseToolInvocation<SaveMemoryParams, ToolResult> {
    getDescription(): string;
    /**
     * Memory save always needs user confirmation.
     */
    getDefaultPermission(): Promise<PermissionDecision>;
    /**
     * Constructs the memory save confirmation dialog.
     */
    getConfirmationDetails(_abortSignal: AbortSignal): Promise<ToolCallConfirmationDetails>;
    execute(_signal: AbortSignal): Promise<ToolResult>;
}
export declare class MemoryTool extends BaseDeclarativeTool<SaveMemoryParams, ToolResult> implements ModifiableDeclarativeTool<SaveMemoryParams> {
    static readonly Name: string;
    constructor();
    protected validateToolParamValues(params: SaveMemoryParams): string | null;
    protected createInvocation(params: SaveMemoryParams): MemoryToolInvocation;
    static performAddMemoryEntry(text: string, memoryFilePath: string, fsAdapter: {
        readFile: (path: string, encoding: 'utf-8') => Promise<string>;
        writeFile: (path: string, data: string, encoding: 'utf-8') => Promise<void>;
        mkdir: (path: string, options: {
            recursive: boolean;
        }) => Promise<string | undefined>;
    }): Promise<void>;
    getModifyContext(_abortSignal: AbortSignal): ModifyContext<SaveMemoryParams>;
}
export {};
