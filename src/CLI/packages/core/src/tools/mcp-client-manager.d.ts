/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { EventEmitter } from 'node:events';
import type { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import type { Config } from '../config/config.js';
import type { SendSdkMcpMessage } from './mcp-client.js';
import { MCPDiscoveryState } from './mcp-client.js';
import type { ToolRegistry } from './tool-registry.js';
/**
 * Configuration for MCP health monitoring
 */
export interface MCPHealthMonitorConfig {
    /** Health check interval in milliseconds (default: 30000ms) */
    checkIntervalMs: number;
    /** Number of consecutive failures before marking as disconnected (default: 3) */
    maxConsecutiveFailures: number;
    /** Enable automatic reconnection (default: true) */
    autoReconnect: boolean;
    /** Delay before reconnection attempt in milliseconds (default: 5000ms) */
    reconnectDelayMs: number;
}
/**
 * Manages the lifecycle of multiple MCP clients, including local child processes.
 * This class is responsible for starting, stopping, and discovering tools from
 * a collection of MCP servers defined in the configuration.
 */
export declare class McpClientManager {
    private clients;
    private readonly toolRegistry;
    private readonly cliConfig;
    private discoveryState;
    private readonly eventEmitter?;
    private readonly sendSdkMcpMessage?;
    private healthConfig;
    private healthCheckTimers;
    private consecutiveFailures;
    private isReconnecting;
    constructor(config: Config, toolRegistry: ToolRegistry, eventEmitter?: EventEmitter, sendSdkMcpMessage?: SendSdkMcpMessage, healthConfig?: Partial<MCPHealthMonitorConfig>);
    /**
     * Initiates the tool discovery process for all configured MCP servers.
     * It connects to each server, discovers its available tools, and registers
     * them with the `ToolRegistry`.
     */
    discoverAllMcpTools(cliConfig: Config): Promise<void>;
    /**
     * Connects to a single MCP server and discovers its tools/prompts.
     * The connected client is tracked so it can be closed by {@link stop}.
     *
     * This is primarily used for on-demand re-discovery flows (e.g. after OAuth).
     */
    discoverMcpToolsForServer(serverName: string, cliConfig: Config): Promise<void>;
    /**
     * Stops all running local MCP servers and closes all client connections.
     * This is the cleanup method to be called on application exit.
     */
    stop(): Promise<void>;
    /**
     * Disconnects a specific MCP server.
     * @param serverName The name of the server to disconnect.
     */
    disconnectServer(serverName: string): Promise<void>;
    getDiscoveryState(): MCPDiscoveryState;
    /**
     * Gets the health monitoring configuration
     */
    getHealthConfig(): MCPHealthMonitorConfig;
    /**
     * Updates the health monitoring configuration
     */
    updateHealthConfig(config: Partial<MCPHealthMonitorConfig>): void;
    /**
     * Starts health monitoring for a specific server
     */
    private startHealthCheck;
    /**
     * Stops health monitoring for a specific server
     */
    private stopHealthCheck;
    /**
     * Stops all health checks
     */
    private stopAllHealthChecks;
    /**
     * Starts health checks for all connected servers
     */
    private startAllHealthChecks;
    /**
     * Performs a health check on a specific server
     */
    private performHealthCheck;
    /**
     * Reconnects a specific server
     */
    private reconnectServer;
    /**
     * Discovers tools incrementally for all configured servers.
     * Only updates servers that have changed or are new.
     */
    discoverAllMcpToolsIncremental(cliConfig: Config): Promise<void>;
    /**
     * Removes a server and its tools
     */
    private removeServer;
    readResource(serverName: string, uri: string, options?: {
        signal?: AbortSignal;
    }): Promise<ReadResourceResult>;
}
