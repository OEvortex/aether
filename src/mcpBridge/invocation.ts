/*---------------------------------------------------------------------------------------------
 *  MCP Bridge Invocation Handler
 *  Handles invoking VS Code LM tools from MCP requests
 *
 *  VS Code LM Tool Result content types (from vscode.d.ts):
 *    - LanguageModelTextPart       { value: string }
 *    - LanguageModelPromptTsxPart  { value: unknown }   (PromptElementJSON)
 *    - LanguageModelDataPart       { data: Uint8Array; mimeType: string }
 *    - LanguageModelTextPart2      extends LanguageModelTextPart + audience
 *    - LanguageModelDataPart2      extends LanguageModelDataPart + audience
 *
 *  ExtendedLanguageModelToolResult adds:
 *    - toolResultMessage?: string | MarkdownString
 *    - toolResultDetails?: Array<Uri | Location>
 *    - toolMetadata?: unknown
 *    - hasError?: boolean
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import type { ToolRegistry } from './toolRegistry';
import type { InvocationLogEntry } from './types';

export interface InvocationResult {
    content: Array<
        | { type: 'text'; text: string }
        | { type: 'image'; data: string; mimeType: string }
    >;
    isError: boolean;
    /** Optional error flag from ExtendedLanguageModelToolResult */
    hasError?: boolean;
    logEntry: InvocationLogEntry;
}

/**
 * Attempt to activate the extension that provides a given tool.
 * This enables invoking tools from extensions that haven't been
 * activated yet (declared in package.json but not loaded).
 */
async function tryActivateExtensionForTool(toolName: string): Promise<boolean> {
    try {
        for (const ext of vscode.extensions.all) {
            const pkg = ext.packageJSON as Record<string, unknown> | undefined;
            const contributes = pkg?.contributes as
                | { languageModelTools?: Array<{ name: string }> }
                | undefined;
            const declaredTools = contributes?.languageModelTools;
            if (Array.isArray(declaredTools)) {
                for (const dt of declaredTools) {
                    if (dt.name === toolName && !ext.isActive) {
                        await ext.activate();
                        return true;
                    }
                }
            }
        }
    } catch {
        // Activation failed — extension may have a dependency issue
    }
    return false;
}

/**
 * Convert a LanguageModelToolResult's content array into MCP-compatible parts.
 *
 * Handles all 3 stable content types + the 2 proposed audience-aware subtypes:
 *   1. LanguageModelTextPart / LanguageModelTextPart2  → text
 *   2. LanguageModelPromptTsxPart                     → serialized text
 *   3. LanguageModelDataPart / LanguageModelDataPart2  → image or text
 */
function convertContentParts(
    content: unknown[]
): Array<
    | { type: 'text'; text: string }
    | { type: 'image'; data: string; mimeType: string }
> {
    const result: Array<
        | { type: 'text'; text: string }
        | { type: 'image'; data: string; mimeType: string }
    > = [];

    for (const part of content) {
        const converted = convertSinglePart(part);
        if (converted !== undefined) {
            result.push(converted);
        }
    }

    return result;
}

function convertSinglePart(
    part: unknown
):
    | { type: 'text'; text: string }
    | { type: 'image'; data: string; mimeType: string }
    | undefined {
    if (part === null || part === undefined) {
        return undefined;
    }

    // LanguageModelTextPart / LanguageModelTextPart2
    // Both have .value: string (TextPart2 adds .audience which we ignore for MCP)
    if (
        typeof part === 'object' &&
        'value' in part &&
        typeof (part as { value: unknown }).value === 'string'
    ) {
        // Distinguish TextPart from PromptTsxPart (both have .value but PromptTsxPart.value is unknown)
        const obj = part as Record<string, unknown>;
        // TextPart has only 'value'; PromptTsxPart also has only 'value' but it's not a string.
        // If value is a string, it's a TextPart.
        return { type: 'text', text: obj.value as string };
    }

    // LanguageModelDataPart / LanguageModelDataPart2
    // Has .mimeType: string and .data: Uint8Array
    if (typeof part === 'object' && 'mimeType' in part && 'data' in part) {
        const dataPart = part as { mimeType: string; data: Uint8Array };
        if (
            typeof dataPart.mimeType === 'string' &&
            dataPart.data instanceof Uint8Array
        ) {
            if (dataPart.mimeType.startsWith('image/')) {
                const base64Data = Buffer.from(dataPart.data).toString(
                    'base64'
                );
                return {
                    type: 'image',
                    data: base64Data,
                    mimeType: dataPart.mimeType
                };
            }
            // Non-image binary: try UTF-8 decode, fall back to placeholder
            try {
                const textData = Buffer.from(dataPart.data).toString('utf-8');
                return { type: 'text', text: textData };
            } catch {
                return {
                    type: 'text',
                    text: `[Binary data: ${dataPart.mimeType}]`
                };
            }
        }
    }

    // LanguageModelPromptTsxPart
    // Has .value: unknown (PromptElementJSON from @vscode/prompt-tsx)
    if (typeof part === 'object' && 'value' in part) {
        const obj = part as { value: unknown };
        const serialized = safeSerialize(obj.value);
        if (serialized !== undefined) {
            return { type: 'text', text: serialized };
        }
        return undefined;
    }

    // Fallback: serialize the entire part as JSON text
    const fallback = safeSerialize(part);
    return fallback !== undefined
        ? { type: 'text', text: fallback }
        : undefined;
}

/**
 * Safe JSON serialization that handles circular refs, undefined, and non-serializable values.
 */
function safeSerialize(value: unknown): string | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return 'null';
    }
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    try {
        const str = JSON.stringify(value);
        return str === undefined ? undefined : str;
    } catch {
        // Circular reference or other serialization error
        try {
            return String(value);
        } catch {
            return undefined;
        }
    }
}

export async function invokeLmTool(
    toolName: string,
    input: Record<string, unknown>,
    registry: ToolRegistry,
    cancellationToken?: vscode.CancellationToken
): Promise<InvocationResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
        // Check if tool exists
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

        // If tool is disabled (extension not active), try to activate the extension
        if (toolEntry.disabledInVscode) {
            const activated = await tryActivateExtensionForTool(toolName);
            if (activated) {
                // Re-discover tools after activation
                registry.refresh();
                const refreshed = registry.getTool(toolName);
                if (refreshed !== undefined && !refreshed.disabledInVscode) {
                    // Tool is now active — continue with invocation
                    return invokeActiveTool(
                        toolName,
                        input,
                        registry,
                        startTime,
                        timestamp,
                        cancellationToken
                    );
                }
            }
            const durationMs = Date.now() - startTime;
            const logEntry: InvocationLogEntry = {
                timestamp,
                toolName,
                status: 'error',
                durationMs,
                errorMessage: `Tool "${toolName}" is disabled in VS Code (extension not active or tool not registered)`
            };
            return {
                content: [
                    {
                        type: 'text',
                        text: `Tool "${toolName}" is disabled in VS Code (extension not active or tool not registered)`
                    }
                ],
                isError: true,
                logEntry
            };
        }

        // If tool is hidden by user filter
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

        return invokeActiveTool(
            toolName,
            input,
            registry,
            startTime,
            timestamp,
            cancellationToken
        );
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

/**
 * Invoke a known-active tool via vscode.lm.invokeTool and convert the result.
 */
async function invokeActiveTool(
    toolName: string,
    input: Record<string, unknown>,
    registry: ToolRegistry,
    startTime: number,
    timestamp: string,
    cancellationToken?: vscode.CancellationToken
): Promise<InvocationResult> {
    try {
        const result = await vscode.lm.invokeTool(
            toolName,
            { input, toolInvocationToken: undefined },
            cancellationToken
        );

        const durationMs = Date.now() - startTime;

        // Convert content parts using discriminator-free duck-typing
        // to handle all stable + proposed subtypes (TextPart2, DataPart2, etc.)
        const rawContent: unknown[] = Array.isArray(result.content)
            ? result.content
            : [];
        const content = convertContentParts(rawContent);

        // Extract ExtendedLanguageModelToolResult metadata if present
        const extResult = result as unknown as Record<string, unknown>;
        const hasError =
            typeof extResult.hasError === 'boolean'
                ? extResult.hasError
                : undefined;
        const toolResultMessage =
            typeof extResult.toolResultMessage === 'string'
                ? extResult.toolResultMessage
                : undefined;

        // If the tool indicated an error but returned content, prepend the error message
        if (hasError === true && toolResultMessage !== undefined) {
            content.unshift({
                type: 'text',
                text: `[Tool Error]: ${toolResultMessage}`
            });
        }

        const logEntry: InvocationLogEntry = {
            timestamp,
            toolName,
            status: 'success',
            durationMs
        };

        registry.recordInvocation(toolName);

        return { content, isError: false, hasError, logEntry };
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
