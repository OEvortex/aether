/*---------------------------------------------------------------------------------------------
 *  MCP Bridge Invocation Handler
 *  Handles invoking VS Code LM tools from MCP requests
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import type { ToolRegistry } from './toolRegistry';
import type { InvocationLogEntry } from './types';

export interface InvocationResult {
    content: Array<{ type: 'text'; text: string }>;
    isError: boolean;
    logEntry: InvocationLogEntry;
}

export async function invokeLmTool(
    toolName: string,
    input: Record<string, unknown>,
    registry: ToolRegistry
): Promise<InvocationResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
        const toolEntry = registry.getTool(toolName);
        if (toolEntry === undefined) {
            const durationMs = Date.now() - startTime;
            const logEntry: InvocationLogEntry = {
                timestamp,
                toolName,
                status: 'error',
                durationMs,
                errorMessage: `Tool "${toolName}" not found`
            };
            return {
                content: [{ type: 'text', text: `Tool "${toolName}" not found` }],
                isError: true,
                logEntry
            };
        }

        if (toolEntry.disabledInVscode) {
            const durationMs = Date.now() - startTime;
            const logEntry: InvocationLogEntry = {
                timestamp,
                toolName,
                status: 'error',
                durationMs,
                errorMessage: `Tool "${toolName}" is disabled in VS Code`
            };
            return {
                content: [{ type: 'text', text: `Tool "${toolName}" is disabled in VS Code (extension not active)` }],
                isError: true,
                logEntry
            };
        }

        if (!toolEntry.exposed) {
            const durationMs = Date.now() - startTime;
            const logEntry: InvocationLogEntry = {
                timestamp,
                toolName,
                status: 'error',
                durationMs,
                errorMessage: `Tool "${toolName}" is hidden`
            };
            return {
                content: [{ type: 'text', text: `Tool "${toolName}" is hidden. Enable it in Aether MCP Bridge panel` }],
                isError: true,
                logEntry
            };
        }

        const result = await vscode.lm.invokeTool(
            toolName,
            { input },
            vscode.CancellationToken.None
        );

        const durationMs = Date.now() - startTime;
        const content = result.content.map(part => {
            if (part instanceof vscode.LanguageModelTextPart) {
                return { type: 'text' as const, text: part.value };
            }
            if (part instanceof vscode.LanguageModelPromptTsxPart) {
                return { type: 'text' as const, text: part.value };
            }
            return { type: 'text' as const, text: JSON.stringify(part) };
        });

        const logEntry: InvocationLogEntry = {
            timestamp,
            toolName,
            status: 'success',
            durationMs
        };

        registry.recordInvocation(toolName);

        return { content, isError: false, logEntry };
    } catch (error) {
        const durationMs = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const logEntry: InvocationLogEntry = {
            timestamp,
            toolName,
            status: 'error',
            durationMs,
            errorMessage
        };
        return {
            content: [{ type: 'text', text: `Tool invocation failed: ${errorMessage}` }],
            isError: true,
            logEntry
        };
    }
}
