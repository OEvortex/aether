/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { createDebugLogger } from '../utils/debugLogger.js';
import { safeJsonStringify } from '../utils/safeJsonStringify.js';
import { truncateToolOutput } from '../utils/truncation.js';
import { ToolErrorType } from './tool-error.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
const debugLogger = createDebugLogger('MCP_TOOL');
class DiscoveredMCPToolInvocation extends BaseToolInvocation {
    mcpTool;
    serverName;
    serverToolName;
    displayName;
    trust;
    cliConfig;
    mcpClient;
    mcpTimeout;
    annotations;
    retryCount;
    static MAX_RECONNECT_RETRIES = 3;
    constructor(mcpTool, serverName, serverToolName, displayName, trust, params = {}, cliConfig, mcpClient, mcpTimeout, annotations, retryCount = 0) {
        super(params);
        this.mcpTool = mcpTool;
        this.serverName = serverName;
        this.serverToolName = serverToolName;
        this.displayName = displayName;
        this.trust = trust;
        this.cliConfig = cliConfig;
        this.mcpClient = mcpClient;
        this.mcpTimeout = mcpTimeout;
        this.annotations = annotations;
        this.retryCount = retryCount;
    }
    /**
     * MCP tool default permission based on trust and annotations:
     * - trust: true in a trusted folder → 'allow' (server explicitly trusted by user config)
     * - readOnlyHint → 'allow'
     * - All other MCP tools → 'ask'
     */
    async getDefaultPermission() {
        // MCP servers explicitly marked as trusted bypass confirmation,
        // but only when the workspace folder is also trusted (security gate).
        if (this.trust === true && this.cliConfig?.isTrustedFolder()) {
            return 'allow';
        }
        // MCP tools annotated with readOnlyHint: true are safe
        if (this.annotations?.readOnlyHint === true) {
            return 'allow';
        }
        return 'ask';
    }
    /**
     * Constructs confirmation dialog details for an MCP tool call.
     */
    async getConfirmationDetails(_abortSignal) {
        // Construct the permission rule for this specific MCP tool.
        const permissionRule = `mcp__${this.serverName}__${this.serverToolName}`;
        const confirmationDetails = {
            type: 'mcp',
            title: 'Confirm MCP Tool Execution',
            serverName: this.serverName,
            toolName: this.serverToolName,
            toolDisplayName: this.displayName,
            permissionRules: [permissionRule],
            onConfirm: async (_outcome, _payload) => {
                // No-op: persistence is handled by coreToolScheduler via PM rules
            }
        };
        return confirmationDetails;
    }
    // Determine if the response contains tool errors
    // This is needed because CallToolResults should return errors inside the response.
    // ref: https://modelcontextprotocol.io/specification/2025-06-18/schema#calltoolresult
    isMCPToolError(rawResponseParts) {
        const functionResponse = rawResponseParts?.[0]?.functionResponse;
        const response = functionResponse?.response;
        if (response) {
            const error = response?.error;
            const isError = error?.isError;
            if (error && (isError === true || isError === 'true')) {
                return true;
            }
        }
        return false;
    }
    async attemptReconnect() {
        if (!this.cliConfig) {
            return null;
        }
        try {
            debugLogger.info(`Attempting to reconnect MCP server '${this.serverName}'...`);
            const toolRegistry = this.cliConfig.getToolRegistry();
            await toolRegistry.discoverToolsForServer(this.serverName);
            const newTool = toolRegistry.getTool(`mcp__${this.serverName}__${this.serverToolName}`);
            if (newTool instanceof DiscoveredMCPTool) {
                debugLogger.info(`Successfully reconnected to MCP server '${this.serverName}'`);
                return newTool;
            }
            return null;
        }
        catch (error) {
            debugLogger.error(`Failed to reconnect MCP server '${this.serverName}': ${error}`);
            return null;
        }
    }
    async handleReconnectOnError(error, signal, updateOutput) {
        debugLogger.error(`MCP server error '${this.serverName}': ${error}`);
        if (this.retryCount < DiscoveredMCPToolInvocation.MAX_RECONNECT_RETRIES) {
            debugLogger.info(`Reconnection attempt ${this.retryCount + 1}/${DiscoveredMCPToolInvocation.MAX_RECONNECT_RETRIES} for MCP server '${this.serverName}'`);
            const newTool = await this.attemptReconnect();
            if (newTool) {
                const newInvocation = new DiscoveredMCPToolInvocation(newTool.mcpTool, this.serverName, this.serverToolName, this.displayName, this.trust, this.params, this.cliConfig, newTool.mcpClient, this.mcpTimeout, this.annotations, this.retryCount + 1);
                return newInvocation.execute(signal, updateOutput);
            }
        }
        else if (this.retryCount >= DiscoveredMCPToolInvocation.MAX_RECONNECT_RETRIES) {
            debugLogger.error(`Max reconnection attempts (${DiscoveredMCPToolInvocation.MAX_RECONNECT_RETRIES}) reached for MCP server '${this.serverName}'`);
        }
        throw error;
    }
    async execute(signal, updateOutput) {
        // Use direct MCP client if available (supports progress notifications),
        // otherwise fall back to the @google/genai mcpToTool wrapper.
        if (this.mcpClient) {
            return this.executeWithDirectClient(signal, updateOutput);
        }
        return this.executeWithCallableTool(signal);
    }
    /**
     * Execute using the raw MCP SDK Client, which supports progress
     * notifications via the onprogress callback. This enables real-time
     * streaming of progress updates to the user during long-running
     * MCP tool calls (e.g., browser automation).
     */
    async executeWithDirectClient(signal, updateOutput) {
        try {
            const callToolResult = await this.mcpClient?.callTool({
                name: this.serverToolName,
                arguments: this.params
            }, undefined, {
                onprogress: (progress) => {
                    if (updateOutput) {
                        const progressData = {
                            type: 'mcp_tool_progress',
                            progress: progress.progress,
                            ...(progress.total != null && {
                                total: progress.total
                            }),
                            ...(progress.message != null && {
                                message: progress.message
                            })
                        };
                        updateOutput(progressData);
                    }
                },
                timeout: this.mcpTimeout,
                signal
            });
            // Wrap the raw CallToolResult into the Part[] format that the
            // existing transform/display functions expect.
            const rawResponseParts = wrapMcpCallToolResultAsParts(this.serverToolName, callToolResult);
            // Ensure the response is not an error
            if (this.isMCPToolError(rawResponseParts)) {
                const errorMessage = `MCP tool '${this.serverToolName}' reported tool error for function call: ${safeJsonStringify({
                    name: this.serverToolName,
                    args: this.params
                })} with response: ${safeJsonStringify(rawResponseParts)}`;
                return {
                    llmContent: errorMessage,
                    returnDisplay: `Error: MCP tool '${this.serverToolName}' reported an error.`,
                    error: {
                        message: errorMessage,
                        type: ToolErrorType.MCP_TOOL_ERROR
                    }
                };
            }
            const transformedParts = transformMcpContentToParts(rawResponseParts);
            const truncatedParts = await this.truncateTextParts(transformedParts);
            return {
                llmContent: truncatedParts,
                returnDisplay: getDisplayFromParts(truncatedParts)
            };
        }
        catch (error) {
            return this.handleReconnectOnError(error, signal, updateOutput);
        }
    }
    /**
     * Fallback: execute using the @google/genai CallableTool wrapper.
     * This path does NOT support progress notifications.
     */
    async executeWithCallableTool(signal) {
        const functionCalls = [
            {
                name: this.serverToolName,
                args: this.params
            }
        ];
        // Race MCP tool call with abort signal to respect cancellation
        try {
            const rawResponseParts = await new Promise((resolve, reject) => {
                if (signal.aborted) {
                    const error = new Error('Tool call aborted');
                    error.name = 'AbortError';
                    reject(error);
                    return;
                }
                const onAbort = () => {
                    cleanup();
                    const error = new Error('Tool call aborted');
                    error.name = 'AbortError';
                    reject(error);
                };
                const cleanup = () => {
                    signal.removeEventListener('abort', onAbort);
                };
                signal.addEventListener('abort', onAbort, { once: true });
                this.mcpTool
                    .callTool(functionCalls)
                    .then((res) => {
                    cleanup();
                    resolve(res);
                })
                    .catch((err) => {
                    cleanup();
                    reject(err);
                });
            });
            // Ensure the response is not an error
            if (this.isMCPToolError(rawResponseParts)) {
                const errorMessage = `MCP tool '${this.serverToolName}' reported tool error for function call: ${safeJsonStringify(functionCalls[0])} with response: ${safeJsonStringify(rawResponseParts)}`;
                return {
                    llmContent: errorMessage,
                    returnDisplay: `Error: MCP tool '${this.serverToolName}' reported an error.`,
                    error: {
                        message: errorMessage,
                        type: ToolErrorType.MCP_TOOL_ERROR
                    }
                };
            }
            const transformedParts = transformMcpContentToParts(rawResponseParts);
            const truncatedParts = await this.truncateTextParts(transformedParts);
            return {
                llmContent: truncatedParts,
                returnDisplay: getDisplayFromParts(truncatedParts)
            };
        }
        catch (error) {
            return this.handleReconnectOnError(error, signal);
        }
    }
    /**
     * Truncates text parts in the transformed result if they exceed the
     * configured threshold. Non-text parts (images, audio, etc.) are preserved.
     */
    async truncateTextParts(parts) {
        if (!this.cliConfig) {
            return parts;
        }
        const result = [];
        for (const part of parts) {
            if (part.text && !part.inlineData) {
                const truncated = await truncateToolOutput(this.cliConfig, `mcp__${this.serverName}__${this.serverToolName}`, part.text);
                result.push({ text: truncated.content });
            }
            else {
                result.push(part);
            }
        }
        return result;
    }
    getDescription() {
        return safeJsonStringify(this.params);
    }
}
export class DiscoveredMCPTool extends BaseDeclarativeTool {
    mcpTool;
    serverName;
    serverToolName;
    parameterSchema;
    trust;
    cliConfig;
    mcpClient;
    mcpTimeout;
    annotations;
    constructor(mcpTool, serverName, serverToolName, description, parameterSchema, trust, nameOverride, cliConfig, mcpClient, mcpTimeout, annotations) {
        super(nameOverride ??
            generateValidName(`mcp__${serverName}__${serverToolName}`), `${serverToolName} (${serverName} MCP Server)`, description, annotations?.readOnlyHint === true ? Kind.Read : Kind.Other, parameterSchema, true, // isOutputMarkdown
        true // canUpdateOutput — enables streaming progress for MCP tools
        );
        this.mcpTool = mcpTool;
        this.serverName = serverName;
        this.serverToolName = serverToolName;
        this.parameterSchema = parameterSchema;
        this.trust = trust;
        this.cliConfig = cliConfig;
        this.mcpClient = mcpClient;
        this.mcpTimeout = mcpTimeout;
        this.annotations = annotations;
    }
    asFullyQualifiedTool() {
        return new DiscoveredMCPTool(this.mcpTool, this.serverName, this.serverToolName, this.description, this.parameterSchema, this.trust, generateValidName(`mcp__${this.serverName}__${this.serverToolName}`), this.cliConfig, this.mcpClient, this.mcpTimeout, this.annotations);
    }
    createInvocation(params) {
        return new DiscoveredMCPToolInvocation(this.mcpTool, this.serverName, this.serverToolName, this.displayName, this.trust, params, this.cliConfig, this.mcpClient, this.mcpTimeout, this.annotations);
    }
}
/**
 * Wraps a raw MCP CallToolResult into the Part[] format that the
 * existing transform/display functions expect. This bridges the gap
 * between the raw MCP SDK response and the @google/genai Part format.
 */
function wrapMcpCallToolResultAsParts(toolName, result) {
    if (!result) {
        return [
            {
                functionResponse: {
                    name: toolName,
                    response: { error: 'No response from MCP tool' }
                }
            }
        ];
    }
    const response = result.isError
        ? { error: result, content: result.content }
        : result;
    return [
        {
            functionResponse: {
                name: toolName,
                response
            }
        }
    ];
}
function transformTextBlock(block) {
    return { text: block.text };
}
function transformImageAudioBlock(block, toolName) {
    return [
        {
            text: `[Tool '${toolName}' provided the following ${block.type} data with mime-type: ${block.mimeType}]`
        },
        {
            inlineData: {
                mimeType: block.mimeType,
                data: block.data
            }
        }
    ];
}
function transformResourceBlock(block, toolName) {
    const resource = block.resource;
    if (resource?.text) {
        return { text: resource.text };
    }
    if (resource?.blob) {
        const mimeType = resource.mimeType || 'application/octet-stream';
        return [
            {
                text: `[Tool '${toolName}' provided the following embedded resource with mime-type: ${mimeType}]`
            },
            {
                inlineData: {
                    mimeType,
                    data: resource.blob
                }
            }
        ];
    }
    return null;
}
function transformResourceLinkBlock(block) {
    return {
        text: `Resource Link: ${block.title || block.name} at ${block.uri}`
    };
}
/**
 * Transforms the raw MCP content blocks from the SDK response into a
 * standard GenAI Part array.
 * @param sdkResponse The raw Part[] array from `mcpTool.callTool()`.
 * @returns A clean Part[] array ready for the scheduler.
 */
function transformMcpContentToParts(sdkResponse) {
    const funcResponse = sdkResponse?.[0]?.functionResponse;
    const mcpContent = funcResponse?.response?.content;
    const toolName = funcResponse?.name || 'unknown tool';
    if (!Array.isArray(mcpContent)) {
        return [{ text: '[Error: Could not parse tool response]' }];
    }
    const transformed = mcpContent.flatMap((block) => {
        switch (block.type) {
            case 'text':
                return transformTextBlock(block);
            case 'image':
            case 'audio':
                return transformImageAudioBlock(block, toolName);
            case 'resource':
                return transformResourceBlock(block, toolName);
            case 'resource_link':
                return transformResourceLinkBlock(block);
            default:
                return null;
        }
    });
    return transformed.filter((part) => part !== null);
}
/**
 * Builds a human-readable display string from transformed Part[].
 * Text parts are shown directly; inline data is summarized by mime type.
 */
function getDisplayFromParts(parts) {
    if (parts.length === 0) {
        return '';
    }
    const displayParts = [];
    for (const part of parts) {
        if (part.text !== undefined) {
            displayParts.push(part.text);
        }
        else if (part.inlineData) {
            displayParts.push(`[${part.inlineData.mimeType}]`);
        }
    }
    return displayParts.join('\n');
}
/** Visible for testing */
export function generateValidName(name) {
    // Replace invalid characters (based on 400 error message from Gemini API) with underscores
    let validToolname = name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    // If longer than 63 characters, replace middle with '___'
    // (Gemini API says max length 64, but actual limit seems to be 63)
    if (validToolname.length > 63) {
        validToolname = `${validToolname.slice(0, 28)}___${validToolname.slice(-32)}`;
    }
    return validToolname;
}
//# sourceMappingURL=mcp-tool.js.map