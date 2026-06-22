/*---------------------------------------------------------------------------------------------
 *  Gemini SDK Handler
 *  Processes model requests using Gemini Code Assist API
 *--------------------------------------------------------------------------------------------*/

import { Logger } from './logger.js';
import { getUserAgent } from './userAgent.js';

export interface GeminiRequestOptions {
    model: string;
    messages: any[];
    generationConfig?: {
        temperature?: number;
        maxOutputTokens?: number;
        topP?: number;
        topK?: number;
        stopSequences?: string[];
    };
    thinkingConfig?: {
        includeThoughts?: boolean;
    };
    tools?: any[];
}

export interface GeminiResponse {
    content: string;
    reasoningContent?: string;
    toolCalls?: any[];
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    finishReason?: string;
}

export class GeminiHandler {
    constructor(
        public readonly provider: string,
        public readonly displayName: string,
        private readonly baseURL?: string
    ) {}

    private async makeRequest(
        endpoint: string,
        body: any,
        accessToken: string,
        signal?: AbortSignal
    ): Promise<any> {
        const url = `${this.baseURL}/${endpoint}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
                'User-Agent': getUserAgent()
            },
            body: JSON.stringify(body),
            signal
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `Gemini API error: ${response.status} ${response.statusText}. ${errorText}`
            );
        }

        return await response.json();
    }

    private buildRequest(
        model: string,
        messages: any[],
        generationConfig?: any,
        thinkingConfig?: any,
        tools?: any[]
    ): any {
        // Convert messages to Gemini format
        const contents = messages
            .map((msg) => {
                const role = msg.role === 'assistant' ? 'model' : 'user';
                const parts: any[] = [];

                if (msg.content) {
                    if (typeof msg.content === 'string') {
                        parts.push({ text: msg.content });
                    } else if (Array.isArray(msg.content)) {
                        for (const part of msg.content) {
                            if (part.text) {
                                parts.push({ text: part.text });
                            } else if (part.imageData && part.imageMimeType) {
                                parts.push({
                                    inlineData: {
                                        mimeType: part.imageMimeType,
                                        data: part.imageData
                                    }
                                });
                            }
                        }
                    }
                }

                if (msg.toolCalls) {
                    for (const tc of msg.toolCalls) {
                        parts.push({
                            functionCall: {
                                name: tc.function.name,
                                args: tc.function.arguments
                            }
                        });
                    }
                }

                if (msg.toolCallId) {
                    parts.push({
                        functionResponse: {
                            name: msg.name || '',
                            response:
                                typeof msg.content === 'string'
                                    ? { result: msg.content }
                                    : msg.content
                        }
                    });
                }

                if (parts.length > 0) {
                    return { role, parts };
                }
                return null;
            })
            .filter((c): c is any => c !== null);

        const request: any = {
            model,
            contents,
            generationConfig: {
                temperature: generationConfig?.temperature ?? 0.7,
                maxOutputTokens: generationConfig?.maxOutputTokens ?? 8192,
                topP: generationConfig?.topP ?? 0.95,
                topK: generationConfig?.topK ?? 40
            }
        };

        // Add thinking config if requested
        if (thinkingConfig?.includeThoughts) {
            request.generationConfig.thinkingConfig = {
                includeThoughts: true
            };
        }

        // Add tools if provided
        if (tools && tools.length > 0) {
            request.tools = tools.map((tool) => ({
                functionDeclarations: [
                    {
                        name: tool.name,
                        description: tool.description || '',
                        parameters: tool.parameters || {
                            type: 'object',
                            properties: {}
                        }
                    }
                ]
            }));
        }

        return request;
    }

    private parseResponse(data: any): GeminiResponse {
        const candidates = data.candidates || [];

        if (candidates.length === 0) {
            return {
                content: '',
                reasoningContent: undefined,
                toolCalls: undefined,
                usage: undefined,
                finishReason: undefined
            };
        }

        const candidate = candidates[0];
        const contentObj = candidate.content || {};
        const parts = contentObj.parts || [];

        let textContent = '';
        let reasoningContent: string | undefined;
        let toolCalls: any[] | undefined;

        for (const part of parts) {
            if (part.text) {
                textContent += part.text;
            }
            if (part.thinking) {
                reasoningContent = part.thinking;
            }
            if (part.functionCall) {
                const fc = part.functionCall;
                if (!toolCalls) {
                    toolCalls = [];
                }
                toolCalls.push({
                    id: crypto.randomUUID(),
                    type: 'function',
                    function: {
                        name: fc.name,
                        arguments: fc.args || fc.arguments || {}
                    }
                });
            }
        }

        let usage: any;
        if (data.usageMetadata) {
            usage = {
                promptTokens: data.usageMetadata.promptTokenCount || 0,
                completionTokens: data.usageMetadata.candidatesTokenCount || 0,
                totalTokens: data.usageMetadata.totalTokenCount || 0
            };
        }

        return {
            content: textContent,
            reasoningContent,
            toolCalls,
            usage,
            finishReason: candidate.finishReason
        };
    }

    async generateContent(
        options: GeminiRequestOptions,
        accessToken: string,
        signal?: AbortSignal
    ): Promise<GeminiResponse> {
        try {
            const request = this.buildRequest(
                options.model,
                options.messages,
                options.generationConfig,
                options.thinkingConfig,
                options.tools
            );

            const data = await this.makeRequest(
                'v1internal:generateContent',
                request,
                accessToken,
                signal
            );
            return this.parseResponse(data);
        } catch (error) {
            Logger.error('Gemini API error:', error);
            throw error;
        }
    }

    async *streamGenerateContent(
        options: GeminiRequestOptions,
        accessToken: string,
        signal?: AbortSignal
    ): AsyncGenerator<GeminiResponse> {
        try {
            const request = this.buildRequest(
                options.model,
                options.messages,
                options.generationConfig,
                options.thinkingConfig,
                options.tools
            );

            const url = `${this.baseURL}/v1internal:streamGenerateContent?alt=sse`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                    'User-Agent': getUserAgent(),
                    Accept: 'text/event-stream'
                },
                body: JSON.stringify(request),
                signal
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `Gemini API error: ${response.status} ${response.statusText}. ${errorText}`
                );
            }

            if (!response.body) {
                throw new Error('No response body');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed.startsWith(':')) {
                        continue;
                    }

                    if (trimmed.startsWith('data:')) {
                        const data = trimmed.slice(5).trim();
                        if (data === '[DONE]') {
                            continue;
                        }

                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.error) {
                                throw new Error(
                                    parsed.error.message || 'Gemini API error'
                                );
                            }
                            yield this.parseResponse(parsed);
                        } catch (e) {
                            if (
                                e instanceof Error &&
                                e.message.includes('Gemini API error')
                            ) {
                                throw e;
                            }
                            // Skip invalid JSON (incomplete chunks)
                        }
                    }
                }
            }
        } catch (error) {
            Logger.error('Gemini streaming error:', error);
            throw error;
        }
    }
}
