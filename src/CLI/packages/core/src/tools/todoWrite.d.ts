/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
import type { ToolResult } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation } from './tools.js';
export interface TodoItem {
    id: string;
    content: string;
    status: 'pending' | 'in_progress' | 'completed';
}
export interface TodoWriteParams {
    todos: TodoItem[];
    modified_by_user?: boolean;
    modified_content?: string;
}
declare class TodoWriteToolInvocation extends BaseToolInvocation<TodoWriteParams, ToolResult> {
    private readonly config;
    private operationType;
    constructor(config: Config, params: TodoWriteParams, operationType?: 'create' | 'update');
    getDescription(): string;
    execute(_signal: AbortSignal): Promise<ToolResult>;
}
/**
 * Utility function to read todos for a specific session (useful for session recovery)
 */
export declare function readTodosForSession(sessionId?: string): Promise<TodoItem[]>;
/**
 * Utility function to list all todo files in the todos directory
 */
export declare function listTodoSessions(): Promise<string[]>;
export declare class TodoWriteTool extends BaseDeclarativeTool<TodoWriteParams, ToolResult> {
    private readonly config;
    static readonly Name: string;
    constructor(config: Config);
    validateToolParams(params: TodoWriteParams): string | null;
    protected createInvocation(params: TodoWriteParams): TodoWriteToolInvocation;
}
export {};
