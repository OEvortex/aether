/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { FunctionDeclaration } from '@google/genai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
export type { Transport };
import type { GetPromptResult, JSONRPCMessage, Prompt, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import type { Config, MCPServerConfig } from '../config/config.js';
import type { PromptRegistry } from '../prompts/prompt-registry.js';
import type { WorkspaceContext } from '../utils/workspaceContext.js';
import { DiscoveredMCPTool } from './mcp-tool.js';
import type { ToolRegistry } from './tool-registry.js';
/**
 * Callback type for sending MCP messages to SDK servers via control plane
 */
export type SendSdkMcpMessage = (serverName: string, message: JSONRPCMessage) => Promise<JSONRPCMessage>;
export declare const MCP_DEFAULT_TIMEOUT_MSEC: number;
export type DiscoveredMCPPrompt = Prompt & {
    serverName: string;
    invoke: (params: Record<string, unknown>) => Promise<GetPromptResult>;
};
/**
 * Enum representing the connection status of an MCP server
 */
export declare enum MCPServerStatus {
    /** Server is disconnected or experiencing errors */
    DISCONNECTED = "disconnected",
    /** Server is in the process of connecting */
    CONNECTING = "connecting",
    /** Server is connected and ready to use */
    CONNECTED = "connected"
}
/**
 * Enum representing the overall MCP discovery state
 */
export declare enum MCPDiscoveryState {
    /** Discovery has not started yet */
    NOT_STARTED = "not_started",
    /** Discovery is currently in progress */
    IN_PROGRESS = "in_progress",
    /** Discovery has completed (with or without errors) */
    COMPLETED = "completed"
}
/**
 * A client for a single MCP server.
 *
 * This class is responsible for connecting to, discovering tools from, and
 * managing the state of a single MCP server.
 */
export declare class McpClient {
    private readonly serverName;
    private readonly serverConfig;
    private readonly toolRegistry;
    private readonly promptRegistry;
    private readonly workspaceContext;
    private readonly debugMode;
    private readonly sendSdkMcpMessage?;
    private client;
    private transport;
    private status;
    private isDisconnecting;
    constructor(serverName: string, serverConfig: MCPServerConfig, toolRegistry: ToolRegistry, promptRegistry: PromptRegistry, workspaceContext: WorkspaceContext, debugMode: boolean, sendSdkMcpMessage?: SendSdkMcpMessage | undefined);
    /**
     * Connects to the MCP server.
     */
    connect(): Promise<void>;
    /**
     * Discovers tools and prompts from the MCP server.
     */
    discover(cliConfig: Config): Promise<void>;
    /**
     * Disconnects from the MCP server.
     */
    disconnect(): Promise<void>;
    /**
     * Returns the current status of the client.
     */
    getStatus(): MCPServerStatus;
    readResource(uri: string, options?: {
        signal?: AbortSignal;
    }): Promise<ReadResourceResult>;
    private updateStatus;
    private createTransport;
    private discoverTools;
    private discoverPrompts;
}
/**
 * Map to track which MCP servers have been discovered to require OAuth
 */
export declare const mcpServerRequiresOAuth: Map<string, boolean>;
/**
 * Event listeners for MCP server status changes
 */
type StatusChangeListener = (serverName: string, status: MCPServerStatus) => void;
/**
 * Add a listener for MCP server status changes
 */
export declare function addMCPStatusChangeListener(listener: StatusChangeListener): void;
/**
 * Remove a listener for MCP server status changes
 */
export declare function removeMCPStatusChangeListener(listener: StatusChangeListener): void;
/**
 * Update the status of an MCP server
 */
export declare function updateMCPServerStatus(serverName: string, status: MCPServerStatus): void;
/**
 * Get the current status of an MCP server
 */
export declare function getMCPServerStatus(serverName: string): MCPServerStatus;
/**
 * Get all MCP server statuses
 */
export declare function getAllMCPServerStatuses(): Map<string, MCPServerStatus>;
/**
 * Get the current MCP discovery state
 */
export declare function getMCPDiscoveryState(): MCPDiscoveryState;
/**
 * Discovers tools from all configured MCP servers and registers them with the tool registry.
 * It orchestrates the connection and discovery process for each server defined in the
 * configuration, as well as any server specified via a command-line argument.
 *
 * @param mcpServers A record of named MCP server configurations.
 * @param mcpServerCommand An optional command string for a dynamically specified MCP server.
 * @param toolRegistry The central registry where discovered tools will be registered.
 * @returns A promise that resolves when the discovery process has been attempted for all servers.
 */
export declare function discoverMcpTools(mcpServers: Record<string, MCPServerConfig>, mcpServerCommand: string | undefined, toolRegistry: ToolRegistry, promptRegistry: PromptRegistry, debugMode: boolean, workspaceContext: WorkspaceContext, cliConfig: Config): Promise<void>;
/** Visible for Testing */
export declare function populateMcpServerCommand(mcpServers: Record<string, MCPServerConfig>, mcpServerCommand: string | undefined): Record<string, MCPServerConfig>;
/**
 * Connects to an MCP server and discovers available tools, registering them with the tool registry.
 * This function handles the complete lifecycle of connecting to a server, discovering tools,
 * and cleaning up resources if no tools are found.
 *
 * @param mcpServerName The name identifier for this MCP server
 * @param mcpServerConfig Configuration object containing connection details
 * @param toolRegistry The registry to register discovered tools with
 * @param sendSdkMcpMessage Optional callback for SDK MCP servers to route messages via control plane.
 * @returns Promise that resolves when discovery is complete
 */
export declare function connectAndDiscover(mcpServerName: string, mcpServerConfig: MCPServerConfig, toolRegistry: ToolRegistry, promptRegistry: PromptRegistry, debugMode: boolean, workspaceContext: WorkspaceContext, cliConfig: Config, sendSdkMcpMessage?: SendSdkMcpMessage): Promise<void>;
/**
 * Discovers and sanitizes tools from a connected MCP client.
 * It retrieves function declarations from the client, filters out disabled tools,
 * generates valid names for them, and wraps them in `DiscoveredMCPTool` instances.
 *
 * @param mcpServerName The name of the MCP server.
 * @param mcpServerConfig The configuration for the MCP server.
 * @param mcpClient The active MCP client instance.
 * @returns A promise that resolves to an array of discovered and enabled tools.
 * @throws An error if no enabled tools are found or if the server provides invalid function declarations.
 */
export declare function discoverTools(mcpServerName: string, mcpServerConfig: MCPServerConfig, mcpClient: Client, cliConfig: Config): Promise<DiscoveredMCPTool[]>;
/**
 * Discovers and logs prompts from a connected MCP client.
 * It retrieves prompt declarations from the client and logs their names.
 *
 * @param mcpServerName The name of the MCP server.
 * @param mcpClient The active MCP client instance.
 */
export declare function discoverPrompts(mcpServerName: string, mcpClient: Client, promptRegistry: PromptRegistry): Promise<Prompt[]>;
/**
 * Invokes a prompt on a connected MCP client.
 *
 * @param mcpServerName The name of the MCP server.
 * @param mcpClient The active MCP client instance.
 * @param promptName The name of the prompt to invoke.
 * @param promptParams The parameters to pass to the prompt.
 * @returns A promise that resolves to the result of the prompt invocation.
 */
export declare function invokeMcpPrompt(mcpServerName: string, mcpClient: Client, promptName: string, promptParams: Record<string, unknown>): Promise<GetPromptResult>;
/**
 * @visiblefortesting
 * Checks if the MCP server configuration has a network transport URL (SSE or HTTP).
 * @param config The MCP server configuration.
 * @returns True if a `url` or `httpUrl` is present, false otherwise.
 */
export declare function hasNetworkTransport(config: MCPServerConfig): boolean;
/**
 * Creates and connects an MCP client to a server based on the provided configuration.
 * It determines the appropriate transport (Stdio, SSE, or Streamable HTTP) and
 * establishes a connection. It also applies a patch to handle request timeouts.
 *
 * @param mcpServerName The name of the MCP server, used for logging and identification.
 * @param mcpServerConfig The configuration specifying how to connect to the server.
 * @param sendSdkMcpMessage Optional callback for SDK MCP servers to route messages via control plane.
 * @returns A promise that resolves to a connected MCP `Client` instance.
 * @throws An error if the connection fails or the configuration is invalid.
 */
export declare function connectToMcpServer(mcpServerName: string, mcpServerConfig: MCPServerConfig, debugMode: boolean, workspaceContext: WorkspaceContext, sendSdkMcpMessage?: SendSdkMcpMessage): Promise<Client>;
/** Visible for Testing */
export declare function createTransport(mcpServerName: string, mcpServerConfig: MCPServerConfig, debugMode: boolean, sendSdkMcpMessage?: SendSdkMcpMessage): Promise<Transport>;
/** Visible for testing */
export declare function isEnabled(funcDecl: FunctionDeclaration, mcpServerName: string, mcpServerConfig: MCPServerConfig): boolean;
