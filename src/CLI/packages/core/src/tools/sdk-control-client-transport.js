/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import { createDebugLogger } from '../utils/debugLogger.js';
const debugLogger = createDebugLogger('MCP_SDK_TRANSPORT');
/**
 * MCP Client Transport for SDK MCP servers
 *
 * Implements the @modelcontextprotocol/sdk Transport interface to enable
 * CLI's MCP client to connect to SDK MCP servers via the control plane.
 */
export class SdkControlClientTransport {
    serverName;
    sendMcpMessage;
    started = false;
    // Transport interface callbacks
    onmessage;
    onerror;
    onclose;
    constructor(options) {
        this.serverName = options.serverName;
        this.sendMcpMessage = options.sendMcpMessage;
        // Note: debugMode option is preserved for API compatibility but no longer used
        // since debugLogger now always writes to the session logfile
    }
    /**
     * Start the transport
     * For SDK transport, this just marks it as ready - no subprocess to spawn
     */
    async start() {
        if (this.started) {
            return;
        }
        this.started = true;
        debugLogger.debug(`Started for server '${this.serverName}'`);
    }
    /**
     * Send a message to the SDK MCP server via control plane
     *
     * Routes the message through the control plane and delivers
     * the response via onmessage callback.
     */
    async send(message) {
        if (!this.started) {
            throw new Error(`SdkControlClientTransport (${this.serverName}) not started. Call start() first.`);
        }
        debugLogger.debug(`Sending message to '${this.serverName}': ${JSON.stringify(message)}`);
        try {
            // Send message to SDK and wait for response
            const response = await this.sendMcpMessage(this.serverName, message);
            debugLogger.debug(`Received response from '${this.serverName}': ${JSON.stringify(response)}`);
            // Deliver response via onmessage callback
            if (this.onmessage) {
                this.onmessage(response);
            }
        }
        catch (error) {
            debugLogger.error(`Error sending to '${this.serverName}': ${error}`);
            if (this.onerror) {
                this.onerror(error instanceof Error ? error : new Error(String(error)));
            }
            throw error;
        }
    }
    /**
     * Close the transport
     */
    async close() {
        if (!this.started) {
            return;
        }
        this.started = false;
        debugLogger.debug(`Closed for server '${this.serverName}'`);
        if (this.onclose) {
            this.onclose();
        }
    }
    /**
     * Check if transport is started
     */
    isStarted() {
        return this.started;
    }
    /**
     * Get server name
     */
    getServerName() {
        return this.serverName;
    }
}
//# sourceMappingURL=sdk-control-client-transport.js.map