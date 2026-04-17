/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { spawn } from 'node:child_process';
import { StringDecoder } from 'node:string_decoder';
import { parse } from 'shell-quote';
import { createDebugLogger } from '../utils/debugLogger.js';
import { safeJsonStringify } from '../utils/safeJsonStringify.js';
import { McpClientManager } from './mcp-client-manager.js';
import { DiscoveredMCPTool } from './mcp-tool.js';
import { ToolErrorType } from './tool-error.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
const debugLogger = createDebugLogger('TOOL_REGISTRY');
class DiscoveredToolInvocation extends BaseToolInvocation {
    config;
    toolName;
    constructor(config, toolName, params) {
        super(params);
        this.config = config;
        this.toolName = toolName;
    }
    getDescription() {
        return safeJsonStringify(this.params);
    }
    async execute(_signal, _updateOutput) {
        const callCommand = this.config.getToolCallCommand();
        const child = spawn(callCommand, [this.toolName]);
        child.stdin.write(JSON.stringify(this.params));
        child.stdin.end();
        let stdout = '';
        let stderr = '';
        let error = null;
        let code = null;
        let signal = null;
        await new Promise((resolve) => {
            const onStdout = (data) => {
                stdout += data?.toString();
            };
            const onStderr = (data) => {
                stderr += data?.toString();
            };
            const onError = (err) => {
                error = err;
            };
            const onClose = (_code, _signal) => {
                code = _code;
                signal = _signal;
                cleanup();
                resolve();
            };
            const cleanup = () => {
                child.stdout.removeListener('data', onStdout);
                child.stderr.removeListener('data', onStderr);
                child.removeListener('error', onError);
                child.removeListener('close', onClose);
                if (child.connected) {
                    child.disconnect();
                }
            };
            child.stdout.on('data', onStdout);
            child.stderr.on('data', onStderr);
            child.on('error', onError);
            child.on('close', onClose);
        });
        // if there is any error, non-zero exit code, signal, or stderr, return error details instead of stdout
        if (error || code !== 0 || signal || stderr) {
            const llmContent = [
                `Stdout: ${stdout || '(empty)'}`,
                `Stderr: ${stderr || '(empty)'}`,
                `Error: ${error ?? '(none)'}`,
                `Exit Code: ${code ?? '(none)'}`,
                `Signal: ${signal ?? '(none)'}`
            ].join('\n');
            return {
                llmContent,
                returnDisplay: llmContent,
                error: {
                    message: llmContent,
                    type: ToolErrorType.DISCOVERED_TOOL_EXECUTION_ERROR
                }
            };
        }
        return {
            llmContent: stdout,
            returnDisplay: stdout
        };
    }
}
export class DiscoveredTool extends BaseDeclarativeTool {
    config;
    description;
    parameterSchema;
    constructor(config, name, description, parameterSchema) {
        const discoveryCmd = config.getToolDiscoveryCommand();
        const callCommand = config.getToolCallCommand();
        description += `

This tool was discovered from the project by executing the command \`${discoveryCmd}\` on project root.
When called, this tool will execute the command \`${callCommand} ${name}\` on project root.
Tool discovery and call commands can be configured in project or user settings.

When called, the tool call command is executed as a subprocess.
On success, tool output is returned as a json string.
Otherwise, the following information is returned:

Stdout: Output on stdout stream. Can be \`(empty)\` or partial.
Stderr: Output on stderr stream. Can be \`(empty)\` or partial.
Error: Error or \`(none)\` if no error was reported for the subprocess.
Exit Code: Exit code or \`(none)\` if terminated by signal.
Signal: Signal number or \`(none)\` if no signal was received.
`;
        super(name, name, description, Kind.Other, parameterSchema, false, // isOutputMarkdown
        false // canUpdateOutput
        );
        this.config = config;
        this.description = description;
        this.parameterSchema = parameterSchema;
    }
    createInvocation(params) {
        return new DiscoveredToolInvocation(this.config, this.name, params);
    }
}
export class ToolRegistry {
    // The tools keyed by tool name as seen by the LLM.
    tools = new Map();
    config;
    mcpClientManager;
    constructor(config, eventEmitter, sendSdkMcpMessage) {
        this.config = config;
        this.mcpClientManager = new McpClientManager(this.config, this, eventEmitter, sendSdkMcpMessage);
    }
    /**
     * Registers a tool definition.
     * @param tool - The tool object containing schema and execution logic.
     */
    registerTool(tool) {
        if (this.tools.has(tool.name)) {
            if (tool instanceof DiscoveredMCPTool) {
                tool = tool.asFullyQualifiedTool();
            }
            else {
                // Decide on behavior: throw error, log warning, or allow overwrite
                debugLogger.warn(`Tool with name "${tool.name}" is already registered. Overwriting.`);
            }
        }
        this.tools.set(tool.name, tool);
    }
    /**
     * Copies discovered (non-core) tools from another registry into this one.
     * Used to share MCP/command-discovered tools with per-agent registries
     * that were built with skipDiscovery.
     */
    copyDiscoveredToolsFrom(source) {
        for (const tool of source.getAllTools()) {
            if ((tool instanceof DiscoveredTool ||
                tool instanceof DiscoveredMCPTool) &&
                !this.tools.has(tool.name)) {
                this.tools.set(tool.name, tool);
            }
        }
    }
    removeDiscoveredTools() {
        for (const tool of this.tools.values()) {
            if (tool instanceof DiscoveredTool ||
                tool instanceof DiscoveredMCPTool) {
                this.tools.delete(tool.name);
            }
        }
    }
    /**
     * Removes all tools from a specific MCP server.
     * @param serverName The name of the server to remove tools from.
     */
    removeMcpToolsByServer(serverName) {
        for (const [name, tool] of this.tools.entries()) {
            if (tool instanceof DiscoveredMCPTool &&
                tool.serverName === serverName) {
                this.tools.delete(name);
            }
        }
    }
    /**
     * Disconnects an MCP server by removing its tools, prompts, and disconnecting the client.
     * Unlike disableMcpServer, this does NOT add the server to the exclusion list.
     * @param serverName The name of the server to disconnect.
     */
    async disconnectServer(serverName) {
        // Remove tools from registry
        this.removeMcpToolsByServer(serverName);
        // Remove prompts
        this.config.getPromptRegistry().removePromptsByServer(serverName);
        // Disconnect the MCP client
        await this.mcpClientManager.disconnectServer(serverName);
    }
    /**
     * Disables an MCP server by removing its tools, prompts, and disconnecting the client.
     * Also updates the config's exclusion list.
     * @param serverName The name of the server to disable.
     */
    async disableMcpServer(serverName) {
        // Remove tools from registry
        this.removeMcpToolsByServer(serverName);
        // Remove prompts
        this.config.getPromptRegistry().removePromptsByServer(serverName);
        // Disconnect the MCP client
        await this.mcpClientManager.disconnectServer(serverName);
        // Update config's exclusion list
        const currentExcluded = this.config.getExcludedMcpServers() || [];
        if (!currentExcluded.includes(serverName)) {
            this.config.setExcludedMcpServers([...currentExcluded, serverName]);
        }
    }
    /**
     * Discovers tools from project (if available and configured).
     * Can be called multiple times to update discovered tools.
     * This will discover tools from the command line and from MCP servers.
     */
    async discoverAllTools() {
        // remove any previously discovered tools
        this.removeDiscoveredTools();
        this.config.getPromptRegistry().clear();
        await this.discoverAndRegisterToolsFromCommand();
        // discover tools using MCP servers, if configured
        await this.mcpClientManager.discoverAllMcpTools(this.config);
    }
    /**
     * Discovers tools from project (if available and configured).
     * Can be called multiple times to update discovered tools.
     * This will NOT discover tools from the command line, only from MCP servers.
     */
    async discoverMcpTools() {
        // remove any previously discovered tools
        this.removeDiscoveredTools();
        this.config.getPromptRegistry().clear();
        // discover tools using MCP servers, if configured
        await this.mcpClientManager.discoverAllMcpTools(this.config);
    }
    /**
     * Restarts all MCP servers and re-discovers tools.
     */
    async restartMcpServers() {
        await this.discoverMcpTools();
    }
    /**
     * Discover or re-discover tools for a single MCP server.
     * @param serverName - The name of the server to discover tools from.
     */
    async discoverToolsForServer(serverName) {
        // Remove any previously discovered tools from this server
        for (const [name, tool] of this.tools.entries()) {
            if (tool instanceof DiscoveredMCPTool &&
                tool.serverName === serverName) {
                this.tools.delete(name);
            }
        }
        this.config.getPromptRegistry().removePromptsByServer(serverName);
        await this.mcpClientManager.discoverMcpToolsForServer(serverName, this.config);
    }
    async discoverAndRegisterToolsFromCommand() {
        const discoveryCmd = this.config.getToolDiscoveryCommand();
        if (!discoveryCmd) {
            return;
        }
        try {
            const cmdParts = parse(discoveryCmd);
            if (cmdParts.length === 0) {
                throw new Error('Tool discovery command is empty or contains only whitespace.');
            }
            const proc = spawn(cmdParts[0], cmdParts.slice(1));
            let stdout = '';
            const stdoutDecoder = new StringDecoder('utf8');
            let stderr = '';
            const stderrDecoder = new StringDecoder('utf8');
            let sizeLimitExceeded = false;
            const MAX_STDOUT_SIZE = 10 * 1024 * 1024; // 10MB limit
            const MAX_STDERR_SIZE = 10 * 1024 * 1024; // 10MB limit
            let stdoutByteLength = 0;
            let stderrByteLength = 0;
            proc.stdout.on('data', (data) => {
                if (sizeLimitExceeded) {
                    return;
                }
                if (stdoutByteLength + data.length > MAX_STDOUT_SIZE) {
                    sizeLimitExceeded = true;
                    proc.kill();
                    return;
                }
                stdoutByteLength += data.length;
                stdout += stdoutDecoder.write(data);
            });
            proc.stderr.on('data', (data) => {
                if (sizeLimitExceeded) {
                    return;
                }
                if (stderrByteLength + data.length > MAX_STDERR_SIZE) {
                    sizeLimitExceeded = true;
                    proc.kill();
                    return;
                }
                stderrByteLength += data.length;
                stderr += stderrDecoder.write(data);
            });
            await new Promise((resolve, reject) => {
                proc.on('error', reject);
                proc.on('close', (code) => {
                    stdout += stdoutDecoder.end();
                    stderr += stderrDecoder.end();
                    if (sizeLimitExceeded) {
                        return reject(new Error(`Tool discovery command output exceeded size limit of ${MAX_STDOUT_SIZE} bytes.`));
                    }
                    if (code !== 0) {
                        debugLogger.error(`Tool discovery command failed with code ${code}`);
                        debugLogger.error(stderr);
                        return reject(new Error(`Tool discovery command failed with exit code ${code}`));
                    }
                    resolve();
                });
            });
            // execute discovery command and extract function declarations (w/ or w/o "tool" wrappers)
            const functions = [];
            const discoveredItems = JSON.parse(stdout.trim());
            if (!discoveredItems || !Array.isArray(discoveredItems)) {
                throw new Error('Tool discovery command did not return a JSON array of tools.');
            }
            for (const tool of discoveredItems) {
                if (tool && typeof tool === 'object') {
                    if (Array.isArray(tool.function_declarations)) {
                        functions.push(...tool.function_declarations);
                    }
                    else if (Array.isArray(tool.functionDeclarations)) {
                        functions.push(...tool.functionDeclarations);
                    }
                    else if (tool.name) {
                        functions.push(tool);
                    }
                }
            }
            // register each function as a tool
            for (const func of functions) {
                if (!func.name) {
                    debugLogger.warn('Discovered a tool with no name. Skipping.');
                    continue;
                }
                const parameters = func.parametersJsonSchema &&
                    typeof func.parametersJsonSchema === 'object' &&
                    !Array.isArray(func.parametersJsonSchema)
                    ? func.parametersJsonSchema
                    : {};
                this.registerTool(new DiscoveredTool(this.config, func.name, func.description ?? '', parameters));
            }
        }
        catch (e) {
            debugLogger.error(`Tool discovery command "${discoveryCmd}" failed:`, e);
            throw e;
        }
    }
    /**
     * Retrieves the list of tool schemas (FunctionDeclaration array).
     * Extracts the declarations from the ToolListUnion structure.
     * Includes discovered (vs registered) tools if configured.
     * @returns An array of FunctionDeclarations.
     */
    getFunctionDeclarations() {
        const declarations = [];
        this.tools.forEach((tool) => {
            declarations.push(tool.schema);
        });
        return declarations;
    }
    /**
     * Retrieves a filtered list of tool schemas based on a list of tool names.
     * @param toolNames - An array of tool names to include.
     * @returns An array of FunctionDeclarations for the specified tools.
     */
    getFunctionDeclarationsFiltered(toolNames) {
        const declarations = [];
        for (const name of toolNames) {
            const tool = this.tools.get(name);
            if (tool) {
                declarations.push(tool.schema);
            }
        }
        return declarations;
    }
    /**
     * Returns an array of all registered and discovered tool names.
     */
    getAllToolNames() {
        return Array.from(this.tools.keys());
    }
    /**
     * Returns an array of all registered and discovered tool instances.
     */
    getAllTools() {
        return Array.from(this.tools.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
    }
    /**
     * Returns an array of tools registered from a specific MCP server.
     */
    getToolsByServer(serverName) {
        const serverTools = [];
        for (const tool of this.tools.values()) {
            if (tool?.serverName === serverName) {
                serverTools.push(tool);
            }
        }
        return serverTools.sort((a, b) => a.name.localeCompare(b.name));
    }
    /**
     * Get the definition of a specific tool.
     */
    getTool(name) {
        return this.tools.get(name);
    }
    async readMcpResource(serverName, uri, options) {
        if (!this.config.isTrustedFolder()) {
            throw new Error('MCP resources are unavailable in untrusted folders.');
        }
        return this.mcpClientManager.readResource(serverName, uri, options);
    }
    /**
     * Stops all MCP clients, disposes tools, and cleans up resources.
     * This method is idempotent and safe to call multiple times.
     */
    async stop() {
        for (const tool of this.tools.values()) {
            if ('dispose' in tool && typeof tool.dispose === 'function') {
                try {
                    tool.dispose();
                }
                catch (error) {
                    debugLogger.error(`Error disposing tool ${tool.name}:`, error);
                }
            }
        }
        try {
            await this.mcpClientManager.stop();
        }
        catch (error) {
            // Log but don't throw - cleanup should be best-effort
            debugLogger.error('Error stopping MCP clients:', error);
        }
    }
}
//# sourceMappingURL=tool-registry.js.map