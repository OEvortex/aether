/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { CallableTool } from '@google/genai';
import type { Config } from '../config/config.js';
import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool } from './tools.js';
type ToolParams = Record<string, unknown>;
/**
 * Minimal interface for the raw MCP Client's callTool method.
 * This avoids a direct import of @modelcontextprotocol/sdk in this file,
 * keeping the dependency contained in mcp-client.ts.
 */
export interface McpDirectClient {
    callTool(params: {
        name: string;
        arguments?: Record<string, unknown>;
    }, resultSchema?: unknown, options?: {
        onprogress?: (progress: {
            progress: number;
            total?: number;
            message?: string;
        }) => void;
        timeout?: number;
        signal?: AbortSignal;
    }): Promise<McpCallToolResult>;
}
/** The result shape returned by MCP SDK Client.callTool(). */
interface McpCallToolResult {
    content?: Array<{
        type: string;
        text?: string;
        data?: string;
        mimeType?: string;
        [key: string]: unknown;
    }>;
    isError?: boolean;
    [key: string]: unknown;
}
/**
 * MCP Tool Annotations as defined in the MCP specification.
 * These provide hints about a tool's behavior to help clients make decisions
 * about tool approval and safety.
 */
export interface McpToolAnnotations {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
}
export declare class DiscoveredMCPTool extends BaseDeclarativeTool<ToolParams, ToolResult> {
    readonly mcpTool: CallableTool;
    readonly serverName: string;
    readonly serverToolName: string;
    readonly parameterSchema: unknown;
    readonly trust?: boolean | undefined;
    readonly cliConfig?: Config | undefined;
    readonly mcpClient?: McpDirectClient | undefined;
    private readonly mcpTimeout?;
    readonly annotations?: McpToolAnnotations | undefined;
    constructor(mcpTool: CallableTool, serverName: string, serverToolName: string, description: string, parameterSchema: unknown, trust?: boolean | undefined, nameOverride?: string, cliConfig?: Config | undefined, mcpClient?: McpDirectClient | undefined, mcpTimeout?: number | undefined, annotations?: McpToolAnnotations | undefined);
    asFullyQualifiedTool(): DiscoveredMCPTool;
    protected createInvocation(params: ToolParams): ToolInvocation<ToolParams, ToolResult>;
}
/** Visible for testing */
export declare function generateValidName(name: string): string;
export {};
