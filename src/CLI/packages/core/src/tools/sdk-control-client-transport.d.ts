/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * SdkControlClientTransport - MCP Client transport for SDK MCP servers
 *
 * This transport enables CLI's MCP client to connect to SDK MCP servers
 * through the control plane. Messages are routed:
 *
 * CLI MCP Client → SdkControlClientTransport → sendMcpMessage() →
 * control_request (mcp_message) → SDK → control_response → onmessage → CLI
 *
 * Unlike StdioClientTransport which spawns a subprocess, this transport
 * communicates with SDK MCP servers running in the SDK process.
 */
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
/**
 * Callback to send MCP messages to SDK via control plane
 * Returns the MCP response from the SDK
 */
export type SendMcpMessageCallback = (serverName: string, message: JSONRPCMessage) => Promise<JSONRPCMessage>;
export interface SdkControlClientTransportOptions {
    serverName: string;
    sendMcpMessage: SendMcpMessageCallback;
    debugMode?: boolean;
}
/**
 * MCP Client Transport for SDK MCP servers
 *
 * Implements the @modelcontextprotocol/sdk Transport interface to enable
 * CLI's MCP client to connect to SDK MCP servers via the control plane.
 */
export declare class SdkControlClientTransport {
    private serverName;
    private sendMcpMessage;
    private started;
    onmessage?: (message: JSONRPCMessage) => void;
    onerror?: (error: Error) => void;
    onclose?: () => void;
    constructor(options: SdkControlClientTransportOptions);
    /**
     * Start the transport
     * For SDK transport, this just marks it as ready - no subprocess to spawn
     */
    start(): Promise<void>;
    /**
     * Send a message to the SDK MCP server via control plane
     *
     * Routes the message through the control plane and delivers
     * the response via onmessage callback.
     */
    send(message: JSONRPCMessage): Promise<void>;
    /**
     * Close the transport
     */
    close(): Promise<void>;
    /**
     * Check if transport is started
     */
    isStarted(): boolean;
    /**
     * Get server name
     */
    getServerName(): string;
}
