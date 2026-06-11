/*---------------------------------------------------------------------------------------------
 *  MimoCode Handler
 *  Handles JWT bootstrap and OpenAI-compatible chat completions for the free Mimo API
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import type { ModelConfig, ProviderConfig } from '../../types/sharedTypes';
import { ConfigManager } from '../../utils/configManager';
import { Logger, getUserAgent } from '../../utils';

interface MimoCodeStreamChunk {
    id?: string;
    model?: string;
    choices?: Array<{
        index?: number;
        delta?: {
            role?: string;
            content?: string | null;
            tool_calls?: Array<{
                index?: number;
                id?: string;
                type?: string;
                function?: {
                    name?: string;
                    arguments?: string;
                };
            }>;
        };
        message?: {
            content?: string | null;
            tool_calls?: Array<{
                index?: number;
                id?: string;
                type?: string;
                function?: {
                    name?: string;
                    arguments?: string;
                };
            }>;
        };
        finish_reason?: string | null;
    }>;
}

type MimoCodeRequestContext = {
    providerKey: string;
    displayName: string;
    providerConfig: ProviderConfig;
    modelConfig: ModelConfig;
    messages: readonly vscode.LanguageModelChatMessage[];
    options: vscode.ProvideLanguageModelChatResponseOptions;
    progress: vscode.Progress<vscode.LanguageModelResponsePart2>;
    token: vscode.CancellationToken;
};

type MimoCodeMessage = {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content?: string | null;
    tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
            name: string;
            arguments: string;
        };
    }>;
    tool_call_id?: string;
};

const BOOTSTRAP_URL = 'https://api.xiaomimimo.com/api/free-ai/bootstrap';
const CHAT_URL = 'https://api.xiaomimimo.com/api/free-ai/openai/chat';
const MIMO_SOURCE_HEADER = 'mimocode-cli-free';

export class MimoCodeHandler {
    private cachedJwt: string | null = null;
    private jwtObtainedAt = 0;
    private jwtTtlMs = 3000 * 1000; // Default 50 min TTL (server sends 60min expiry)

    /**
     * Bootstrap a new JWT token from the free API
     */
    private async bootstrapJwt(): Promise<string> {
        // Return cached JWT if still valid (with 5 min buffer)
        const timeSinceObtained = Date.now() - this.jwtObtainedAt;
        if (this.cachedJwt && timeSinceObtained < this.jwtTtlMs - 300000) {
            return this.cachedJwt;
        }

        Logger.debug('[MimoCode] Bootstrapping new JWT token...');

        const response = await fetch(BOOTSTRAP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ client: 'haha' })
        });

        if (!response.ok) {
            let errorText = '';
            try {
                errorText = await response.text();
            } catch {
                // ignore
            }
            throw new Error(
                `MimoCode bootstrap failed: ${response.status} ${response.statusText}${errorText ? `\n${errorText}` : ''}`
            );
        }

        const data = (await response.json()) as Record<string, unknown>;
        const jwt = data.jwt as string | undefined;

        if (!jwt) {
            throw new Error(
                `MimoCode bootstrap response missing JWT: ${JSON.stringify(data)}`
            );
        }

        this.cachedJwt = jwt;
        this.jwtObtainedAt = Date.now();

        Logger.debug('[MimoCode] JWT bootstrap successful');
        return jwt;
    }

    /**
     * Force refresh JWT (used when a 401 is received)
     */
    private invalidateJwt(): void {
        this.cachedJwt = null;
        this.jwtObtainedAt = 0;
    }

    /**
     * Build request headers with JWT authorization
     */
    private async buildHeaders(): Promise<Record<string, string>> {
        const jwt = await this.bootstrapJwt();
        return {
            Accept: 'text/event-stream',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
            'X-Mimo-Source': MIMO_SOURCE_HEADER,
            'User-Agent': getUserAgent()
        };
    }

    /**
     * Convert VS Code messages to MimoCode message format
     */
    private convertMessages(
        messages: readonly vscode.LanguageModelChatMessage[]
    ): MimoCodeMessage[] {
        const result: MimoCodeMessage[] = [];

        for (const message of messages) {
            switch (message.role) {
                case vscode.LanguageModelChatMessageRole.System: {
                    const text = this.extractTextContent(message.content);
                    if (text) {
                        result.push({ role: 'system', content: text });
                    }
                    break;
                }
                case vscode.LanguageModelChatMessageRole.User: {
                    // Collect text and image parts
                    const textParts: string[] = [];
                    for (const part of message.content) {
                        if (part instanceof vscode.LanguageModelTextPart) {
                            textParts.push(part.value);
                        }
                    }
                    const text = textParts.join('\n');
                    if (text) {
                        result.push({ role: 'user', content: text });
                    }

                    // Handle tool results
                    for (const part of message.content) {
                        if (part instanceof vscode.LanguageModelToolResultPart) {
                            const content = this.convertToolResultContent(
                                part.content
                            );
                            result.push({
                                role: 'tool',
                                content,
                                tool_call_id: part.callId
                            });
                        }
                    }
                    break;
                }
                case vscode.LanguageModelChatMessageRole.Assistant: {
                    const text = this.extractTextContent(message.content);
                    const toolCalls: MimoCodeMessage['tool_calls'] = [];

                    for (const part of message.content) {
                        if (
                            part instanceof vscode.LanguageModelToolCallPart
                        ) {
                            toolCalls.push({
                                id: part.callId,
                                type: 'function',
                                function: {
                                    name: part.name,
                                    arguments: JSON.stringify(part.input)
                                }
                            });
                        }
                    }

                    const msg: MimoCodeMessage = {
                        role: 'assistant',
                        content: text || null
                    };

                    if (toolCalls.length > 0) {
                        msg.tool_calls = toolCalls;
                    }

                    result.push(msg);
                    break;
                }
            }
        }

        return result;
    }

    /**
     * Extract text content from message parts
     */
    private extractTextContent(
        content: readonly (
            | vscode.LanguageModelTextPart
            | vscode.LanguageModelDataPart
            | vscode.LanguageModelToolCallPart
            | vscode.LanguageModelToolResultPart
            | vscode.LanguageModelThinkingPart
        )[]
    ): string | null {
        const textParts = content
            .filter((part) => part instanceof vscode.LanguageModelTextPart)
            .map((part) => (part as vscode.LanguageModelTextPart).value);

        return textParts.length > 0 ? textParts.join('\n') : null;
    }

    /**
     * Convert tool result content to string
     */
    private convertToolResultContent(content: unknown): string {
        if (typeof content === 'string') {
            return content;
        }

        if (Array.isArray(content)) {
            return content
                .map((part) => {
                    if (part instanceof vscode.LanguageModelTextPart) {
                        return part.value;
                    }
                    return JSON.stringify(part);
                })
                .join('\n');
        }

        return JSON.stringify(content);
    }

    /**
     * Build the chat request body
     */
    private buildRequestBody(
        modelConfig: ModelConfig,
        messages: readonly vscode.LanguageModelChatMessage[],
        options: vscode.ProvideLanguageModelChatResponseOptions
    ): Record<string, unknown> {
        const body: Record<string, unknown> = {
            model: modelConfig.model || modelConfig.id || 'mimo-auto',
            messages: this.convertMessages(messages),
            max_tokens: ConfigManager.getMaxTokensForModel(
                modelConfig.maxOutputTokens
            ),
            stream: true,
            temperature: ConfigManager.getTemperature()
        };

        if (
            options.tools &&
            options.tools.length > 0 &&
            modelConfig.capabilities?.toolCalling
        ) {
            body.tools = options.tools.map((tool) => ({
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description || '',
                    parameters:
                        (tool.inputSchema as Record<string, unknown>) || {
                            type: 'object',
                            properties: {},
                            required: []
                        }
                }
            }));
            body.tool_choice = 'auto';
        }

        return body;
    }

    /**
     * Try to parse a JSON payload from an SSE line
     */
    private parseJsonPayload(payload: string): MimoCodeStreamChunk | null {
        const trimmed = payload.trim();
        if (!trimmed || trimmed === '[DONE]') {
            return null;
        }

        try {
            return JSON.parse(trimmed) as MimoCodeStreamChunk;
        } catch {
            return null;
        }
    }

    /**
     * Emit accumulated tool calls
     */
    private emitToolCalls(
        progress: vscode.Progress<vscode.LanguageModelResponsePart2>,
        toolCallIds: Map<number, string>,
        toolCallNames: Map<number, string>,
        toolCallArguments: Map<number, string>,
        completedToolCalls: Set<number>
    ): void {
        for (const [index, args] of toolCallArguments.entries()) {
            if (completedToolCalls.has(index)) {
                continue;
            }
            completedToolCalls.add(index);

            const callId =
                toolCallIds.get(index) || `call_${index}_${Date.now()}`;
            const name = toolCallNames.get(index) || 'unknown_tool';
            let parsedArgs: object;
            try {
                parsedArgs = JSON.parse(args || '{}');
            } catch {
                parsedArgs = { raw: args };
            }

            progress.report(
                new vscode.LanguageModelToolCallPart(callId, name, parsedArgs)
            );
        }
    }

    /**
     * Send a chat completion request to the MimoCode API
     */
    async sendChatCompletion(context: MimoCodeRequestContext): Promise<void> {
        const requestBody = this.buildRequestBody(
            context.modelConfig,
            context.messages,
            context.options
        );

        const controller = new AbortController();
        const cancellation = context.token.onCancellationRequested(() => {
            controller.abort();
        });

        try {
            const headers = await this.buildHeaders();

            Logger.info(
                `[MimoCode] Sending chat request for model: ${context.modelConfig.model || context.modelConfig.id}`
            );

            const response = await fetch(CHAT_URL, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            // If 401, invalidate JWT and retry once
            if (response.status === 401) {
                Logger.debug('[MimoCode] JWT expired, re-bootstrapping...');
                this.invalidateJwt();
                const newHeaders = await this.buildHeaders();

                const retryResponse = await fetch(CHAT_URL, {
                    method: 'POST',
                    headers: newHeaders,
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });

                if (!retryResponse.ok) {
                    let errorText = '';
                    try {
                        errorText = await retryResponse.text();
                    } catch {
                        // ignore
                    }
                    throw new Error(
                        `MimoCode request failed (after retry): ${retryResponse.status} ${retryResponse.statusText}${errorText ? `\n${errorText}` : ''}`
                    );
                }

                await this.handleStreamResponse(
                    retryResponse,
                    context,
                    cancellation
                );
                return;
            }

            if (!response.ok) {
                let errorText = '';
                try {
                    errorText = await response.text();
                } catch {
                    // ignore
                }
                throw new Error(
                    `MimoCode request failed: ${response.status} ${response.statusText}${errorText ? `\n${errorText}` : ''}`
                );
            }

            await this.handleStreamResponse(
                response,
                context,
                cancellation
            );
        } finally {
            cancellation.dispose();
        }
    }

    /**
     * Handle streaming SSE response
     */
    private async handleStreamResponse(
        response: Response,
        context: MimoCodeRequestContext,
        cancellation: vscode.Disposable
    ): Promise<void> {
        if (!response.body) {
            throw new Error('MimoCode response missing body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const toolCallIds = new Map<number, string>();
        const toolCallNames = new Map<number, string>();
        const toolCallArguments = new Map<number, string>();
        const completedToolCalls = new Set<number>();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                buffer += decoder.decode(value, { stream: true });

                // Process SSE events
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const payload = line.slice(6).trim();
                        const chunk = this.parseJsonPayload(payload);
                        if (!chunk) {
                            continue;
                        }

                        this.processChunk(
                            chunk,
                            context,
                            toolCallIds,
                            toolCallNames,
                            toolCallArguments,
                            completedToolCalls
                        );
                    }
                }
            }

            // Process remaining buffer
            if (buffer.startsWith('data: ')) {
                const payload = buffer.slice(6).trim();
                const chunk = this.parseJsonPayload(payload);
                if (chunk) {
                    this.processChunk(
                        chunk,
                        context,
                        toolCallIds,
                        toolCallNames,
                        toolCallArguments,
                        completedToolCalls
                    );
                }
            }

            // Emit remaining tool calls
            this.emitToolCalls(
                context.progress,
                toolCallIds,
                toolCallNames,
                toolCallArguments,
                completedToolCalls
            );

            Logger.debug(
                `[MimoCode] Stream completed for ${context.modelConfig.id}`
            );
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * Process a single chunk from the SSE stream
     */
    private processChunk(
        chunk: MimoCodeStreamChunk,
        context: MimoCodeRequestContext,
        toolCallIds: Map<number, string>,
        toolCallNames: Map<number, string>,
        toolCallArguments: Map<number, string>,
        completedToolCalls: Set<number>
    ): void {
        if (!chunk.choices || chunk.choices.length === 0) {
            return;
        }

        for (const choice of chunk.choices) {
            const delta = choice.delta;
            const message = choice.message;

            // Handle tool calls
            const toolCalls =
                delta?.tool_calls && delta.tool_calls.length > 0
                    ? delta.tool_calls
                    : message?.tool_calls || [];

            for (const toolCall of toolCalls) {
                if (toolCall.index !== undefined && toolCall.id) {
                    toolCallIds.set(toolCall.index, toolCall.id);
                }
                if (toolCall.index !== undefined && toolCall.function?.name) {
                    toolCallNames.set(toolCall.index, toolCall.function.name);
                }
                if (
                    toolCall.index !== undefined &&
                    toolCall.function?.arguments
                ) {
                    const existing =
                        toolCallArguments.get(toolCall.index) || '';
                    toolCallArguments.set(
                        toolCall.index,
                        existing + toolCall.function.arguments
                    );
                }
            }

            // Handle content
            const content = delta?.content ?? message?.content;
            if (typeof content === 'string' && content.length > 0) {
                context.progress.report(
                    new vscode.LanguageModelTextPart(content)
                );
            }

            // Emit tool calls on finish
            if (choice.finish_reason) {
                this.emitToolCalls(
                    context.progress,
                    toolCallIds,
                    toolCallNames,
                    toolCallArguments,
                    completedToolCalls
                );
            }
        }
    }

    /**
     * Fetch available models (hardcoded since there's no models endpoint)
     */
    async fetchModels(): Promise<ModelConfig[]> {
        return [
            {
                id: 'mimo-auto',
                name: 'Mimo Auto',
                tooltip: 'MimoCode free model with 1M context window - automatically selects best available model',
                maxInputTokens: 1024000,
                maxOutputTokens: 16384,
                model: 'mimo-auto',
                sdkMode: 'openai',
                capabilities: {
                    toolCalling: true,
                    imageInput: false
                }
            }
        ];
    }
}
