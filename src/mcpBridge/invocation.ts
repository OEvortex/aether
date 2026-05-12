/*---------------------------------------------------------------------------------------------
 *  MCP Bridge Invocation Handler
 *  Handles invoking VS Code LM tools from MCP requests
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import type { ToolRegistry } from './toolRegistry';
import type { InvocationLogEntry } from './types';

export interface InvocationResult {
    content: Array<{ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }>;
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
                content: [
                    { type: 'text', text: `Tool "${toolName}" not found` }
                ],
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
                content: [
                    {
                        type: 'text',
                        text: `Tool "${toolName}" is disabled in VS Code (extension not active)`
                    }
                ],
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
                content: [
                    {
                        type: 'text',
                        text: `Tool "${toolName}" is hidden. Enable it in Aether MCP Bridge panel`
                    }
                ],
                isError: true,
                logEntry
            };
        }

        const result = await vscode.lm.invokeTool(
            toolName,
            { input, toolInvocationToken: undefined },
            undefined
        ).catch((err: unknown) => {
            // Wrap the error to preserve stack trace
            const errorMessage = err instanceof Error ? err.message : String(err);
            throw new Error(`vscode.lm.invokeTool failed: ${errorMessage}`);
        });

        const durationMs = Date.now() - startTime;
        const content: Array<{ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }> = result.content.map((part) => {
            if (part instanceof vscode.LanguageModelTextPart) {
                return { type: 'text' as const, text: part.value };
            }
            if (part instanceof vscode.LanguageModelPromptTsxPart) {
                return { type: 'text' as const, text: part.value };
            }
            if (part instanceof vscode.LanguageModelDataPart) {
                // Handle binary data (including images) properly for MCP
                // LanguageModelDataPart has mimeType and data (Uint8Array)
                const mimeType = part.mimeType;
                
                // Check if this is an image based on MIME type
                if (mimeType.startsWith('image/')) {
                    // Convert Uint8Array to base64 string for MCP
                    const base64Data = Buffer.from(part.data).toString('base64');
                    return { 
                        type: 'image' as const, 
                        data: base64Data, 
                        mimeType 
                    };
                } else {
                    // For non-image binary data, convert to text representation
                    try {
                        const textData = Buffer.from(part.data).toString('utf-8');
                        return { type: 'text' as const, text: textData };
                    } catch {
                        return { type: 'text' as const, text: `[Binary data: ${mimeType}]` };
                    }
                }
            }
            // For any other content types, serialize as text to maintain compatibility
            return { type: 'text' as const, text: String(JSON.stringify(part)) };
        }).filter((contentItem): contentItem is { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string } => {
            // Validate content items to ensure MCP compliance
            if (contentItem.type === 'text') {
                return typeof contentItem.text === 'string';
            } else if (contentItem.type === 'image') {
                return typeof contentItem.data === 'string' && typeof contentItem.mimeType === 'string';
            }
            return false;
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
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        const logEntry: InvocationLogEntry = {
            timestamp,
            toolName,
            status: 'error',
            durationMs,
            errorMessage
        };
        return {
            content: [
                {
                    type: 'text',
                    text: `Tool invocation failed: ${errorMessage}`
                }
            ],
            isError: true,
            logEntry
        };
    }
}
