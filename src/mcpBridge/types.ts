/*---------------------------------------------------------------------------------------------
 *  MCP Bridge Type Definitions
 *  Types for the VS Code LM Tools → MCP Bridge feature
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/**
 * A tool that has been discovered and may be exposed via MCP
 */
export interface BridgedTool {
    name: string;
    shortDescription: string;
    description: string;
    toolIconId?: string;
    inputSchema?: Record<string, unknown>;
    tags?: string[];
    exposed: boolean;
    invocationCount: number;
    extensionId: string;
    extensionDisplayName: string;
    disabledInVscode: boolean;
}

/**
 * Filter configuration for tool/extension inclusion/exclusion
 */
export interface FilterConfig {
    includeTools: string[];
    excludeTools: string[];
    includeExtensions: string[];
    excludeExtensions: string[];
}

/**
 * Information written to the endpoint discovery file
 */
export interface EndpointInfo {
    httpUrl: string;
    port: number;
    stdioEntrypoint?: string;
    windowId: string;
    pid: number;
    createdAt: string;
}

/**
 * Log entry for tool invocations
 */
export interface InvocationLogEntry {
    timestamp: string;
    toolName: string;
    status: 'success' | 'error';
    durationMs: number;
    errorMessage?: string;
}

/**
 * Options for the HTTP MCP Server
 */
export interface HttpMcpServerOptions {
    port: number;
    registry: ToolRegistry;
    outputChannel: vscode.OutputChannel;
    onInvocation?: (entry: InvocationLogEntry) => void;
    onToolBlocked?: (toolName: string, reason: 'hidden' | 'disabled') => void;
}

/**
 * HTTP MCP Server interface
 */
export interface HttpMcpServer {
    readonly port: number;
    dispose(): Promise<void>;
}

/**
 * Declared tool from extension package.json
 */
export interface DeclaredTool {
    name: string;
    displayName?: string;
    description?: string;
    modelDescription?: string;
    inputSchema?: Record<string, unknown>;
    icon?: unknown;
}

/**
 * Extension to tool mapping
 */
export interface ExtensionToolMapping {
    extensionId: string;
    extensionDisplayName: string;
}
