import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => {
    class EventEmitter<T> {
        public event = (): void => undefined;

        fire(_value: T): void {
            return;
        }

        dispose(): void {
            return;
        }
    }

    class CancellationError extends Error {
        constructor() {
            super('Cancelled');
            this.name = 'CancellationError';
        }
    }

    class LanguageModelThinkingPart {
        constructor(
            public value: string | string[],
            public id?: string
        ) {}
    }

    class LanguageModelTextPart {
        constructor(public value: string) {}
    }

    class LanguageModelToolCallPart {
        constructor(
            public callId: string,
            public name: string,
            public input: Record<string, unknown>
        ) {}
    }

    return {
        CancellationError,
        EventEmitter,
        LanguageModelChatMessageRole: {
            Assistant: 'assistant',
            System: 'system',
            User: 'user'
        },
        LanguageModelThinkingPart,
        LanguageModelTextPart,
        LanguageModelToolCallPart
    };
});

vi.mock('../../utils/apiKeyManager', () => ({
    ApiKeyManager: {
        getApiKey: vi.fn().mockResolvedValue('test-api-key'),
        processCustomHeader: vi.fn().mockReturnValue({})
    }
}));

vi.mock('../../utils/configManager', () => ({
    ConfigManager: {
        getMaxTokensForModel: vi.fn().mockReturnValue(8192),
        getTemperature: vi.fn().mockReturnValue(0.1),
        getTopP: vi.fn().mockReturnValue(1)
    }
}));

vi.mock('../../utils/knownProviders', () => ({
    getProviderRateLimit: vi.fn().mockReturnValue(null),
    recordProviderRateLimitFromHeaders: vi.fn()
}));

vi.mock('../../utils/logger', () => ({
    Logger: {
        debug: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        trace: vi.fn(),
        warn: vi.fn()
    }
}));

vi.mock('../../utils/rateLimiter', () => ({
    RateLimiter: {
        getInstance: vi.fn().mockReturnValue({
            executeWithRetry: vi
                .fn()
                .mockImplementation(async (fn: () => Promise<void>) => {
                    await fn();
                })
        })
    }
}));

vi.mock('../../utils/retryManager', () => ({
    RetryManager: {
        getInstance: vi.fn().mockReturnValue({
            executeWithRetry: vi
                .fn()
                .mockImplementation(async (fn: () => Promise<void>) => {
                    await fn();
                })
        })
    }
}));

vi.mock('../../utils/tokenCounter', () => ({
    TokenCounter: {
        getInstance: vi.fn().mockReturnValue({
            countMessagesTokens: vi.fn().mockResolvedValue(100)
        })
    }
}));

vi.mock('../../utils/tokenTelemetryTracker', () => ({
    TokenTelemetryTracker: {
        getInstance: vi.fn().mockReturnValue({
            recordSuccess: vi.fn(),
            recordCancelled: vi.fn(),
            recordError: vi.fn()
        })
    }
}));

vi.mock('../../utils/userAgent', () => ({
    getUserAgent: vi.fn().mockReturnValue('test-agent/1.0')
}));

import * as vscode from 'vscode';
import { ResponsesHandler } from './responsesHandler';

/** Build a minimal LanguageModelChatInformation mock */
function makeModel(
    overrides: Partial<vscode.LanguageModelChatInformation> = {}
): vscode.LanguageModelChatInformation {
    return {
        id: 'test-model',
        name: 'Test Model',
        maxInputTokens: 128000,
        maxOutputTokens: 8192,
        capabilities: {
            toolCalling: true,
            imageInput: false
        },
        ...overrides
    } as unknown as vscode.LanguageModelChatInformation;
}

/** Build a minimal ModelConfig */
function makeModelConfig(overrides: Record<string, unknown> = {}) {
    return {
        model: 'test-model',
        sdkMode: 'oai-response' as const,
        outputThinking: true,
        ...overrides
    };
}

/** Build a non-cancelling CancellationToken */
function makeToken(): vscode.CancellationToken {
    return {
        isCancellationRequested: false,
        onCancellationRequested: (_listener: () => void) => ({
            dispose: () => undefined
        })
    } as unknown as vscode.CancellationToken;
}

/** Async-iterable helper from an array of events */
async function* asyncIter<T>(items: T[]): AsyncIterable<T> {
    for (const item of items) {
        yield item;
    }
}

describe('ResponsesHandler streaming', () => {
    let handler: ResponsesHandler;
    let reportedParts: vscode.LanguageModelResponsePart2[];
    let progress: vscode.Progress<vscode.LanguageModelResponsePart2>;

    beforeEach(() => {
        handler = new ResponsesHandler('apertis', 'Apertis AI');
        reportedParts = [];
        progress = {
            report: (part: vscode.LanguageModelResponsePart2) =>
                reportedParts.push(part)
        };
    });

    afterEach(() => {
        handler.dispose();
        vi.clearAllMocks();
    });

    it('emits text deltas from response.output_text.delta events', async () => {
        const events = [
            { type: 'response.output_text.delta', delta: 'Hello' },
            { type: 'response.output_text.delta', delta: ', world' },
            {
                type: 'response.completed',
                response: {
                    usage: { input_tokens: 10, output_tokens: 5 },
                    output: []
                }
            }
        ];

        const mockStream = asyncIter(events);
        const mockClientInst = {
            responses: {
                create: vi.fn().mockReturnValue({
                    withResponse: () =>
                        Promise.resolve({
                            data: mockStream,
                            response: { headers: {} }
                        })
                })
            }
        };
        (handler as unknown as Record<string, unknown>).createOpenAIClient = vi
            .fn()
            .mockResolvedValue(mockClientInst);

        await handler.handleRequest(
            makeModel(),
            makeModelConfig() as Parameters<typeof handler.handleRequest>[1],
            [],
            {} as vscode.ProvideLanguageModelChatResponseOptions,
            progress,
            makeToken()
        );

        const textParts = reportedParts.filter(
            (p) => p instanceof vscode.LanguageModelTextPart
        );
        const combined = textParts
            .map((p) => (p as vscode.LanguageModelTextPart).value)
            .join('');
        expect(combined).toContain('Hello');
        expect(combined).toContain(', world');
    });

    it('emits thinking parts from response.reasoning_text.delta events', async () => {
        const events = [
            {
                type: 'response.reasoning_text.delta',
                delta: 'step one',
                item_id: 'think-1'
            },
            { type: 'response.reasoning_text.done', item_id: 'think-1' },
            { type: 'response.output_text.delta', delta: 'answer' },
            {
                type: 'response.completed',
                response: {
                    usage: { input_tokens: 5, output_tokens: 2 },
                    output: []
                }
            }
        ];

        const mockStream = asyncIter(events);
        const mockClientInst = {
            responses: {
                create: vi.fn().mockReturnValue({
                    withResponse: () =>
                        Promise.resolve({
                            data: mockStream,
                            response: { headers: {} }
                        })
                })
            }
        };
        (handler as unknown as Record<string, unknown>).createOpenAIClient = vi
            .fn()
            .mockResolvedValue(mockClientInst);

        await handler.handleRequest(
            makeModel(),
            makeModelConfig() as Parameters<typeof handler.handleRequest>[1],
            [],
            {} as vscode.ProvideLanguageModelChatResponseOptions,
            progress,
            makeToken()
        );

        const thinkingParts = reportedParts.filter(
            (p) => p instanceof vscode.LanguageModelThinkingPart
        );
        // Should have a delta part and a done (empty) part
        expect(thinkingParts.length).toBeGreaterThanOrEqual(2);
        const firstThink = thinkingParts[0] as vscode.LanguageModelThinkingPart;
        expect(firstThink.value).toBe('step one');
    });

    it('emits tool call parts from response.output_item.done function_call events', async () => {
        const events = [
            {
                type: 'response.output_item.done',
                item: {
                    type: 'function_call',
                    call_id: 'call-1',
                    id: 'item-1',
                    name: 'read_file',
                    arguments: '{"path":"src/index.ts"}'
                }
            },
            {
                type: 'response.completed',
                response: {
                    usage: { input_tokens: 8, output_tokens: 3 },
                    output: []
                }
            }
        ];

        const mockStream = asyncIter(events);
        const mockClientInst = {
            responses: {
                create: vi.fn().mockReturnValue({
                    withResponse: () =>
                        Promise.resolve({
                            data: mockStream,
                            response: { headers: {} }
                        })
                })
            }
        };
        (handler as unknown as Record<string, unknown>).createOpenAIClient = vi
            .fn()
            .mockResolvedValue(mockClientInst);

        await handler.handleRequest(
            makeModel(),
            makeModelConfig() as Parameters<typeof handler.handleRequest>[1],
            [],
            {} as vscode.ProvideLanguageModelChatResponseOptions,
            progress,
            makeToken()
        );

        const toolParts = reportedParts.filter(
            (p) => p instanceof vscode.LanguageModelToolCallPart
        );
        expect(toolParts).toHaveLength(1);
        const toolCall = toolParts[0] as vscode.LanguageModelToolCallPart;
        expect(toolCall.callId).toBe('call-1');
        expect(toolCall.name).toBe('read_file');
        expect(toolCall.input).toEqual({ path: 'src/index.ts' });
    });

    it('throws on response.failed events', async () => {
        const events = [
            {
                type: 'response.failed',
                response: { usage: null, output: [] }
            }
        ];

        const mockStream = asyncIter(events);
        const mockClientInst = {
            responses: {
                create: vi.fn().mockReturnValue({
                    withResponse: () =>
                        Promise.resolve({
                            data: mockStream,
                            response: { headers: {} }
                        })
                })
            }
        };
        (handler as unknown as Record<string, unknown>).createOpenAIClient = vi
            .fn()
            .mockResolvedValue(mockClientInst);

        await expect(
            handler.handleRequest(
                makeModel(),
                makeModelConfig() as Parameters<
                    typeof handler.handleRequest
                >[1],
                [],
                {} as vscode.ProvideLanguageModelChatResponseOptions,
                progress,
                makeToken()
            )
        ).rejects.toThrow('OpenAI Responses stream failed.');
    });

    it('falls back to response.output_text.done text when no deltas were received', async () => {
        const events = [
            { type: 'response.output_text.done', text: 'fallback text' },
            {
                type: 'response.completed',
                response: {
                    usage: { input_tokens: 5, output_tokens: 2 },
                    output: [
                        {
                            type: 'message',
                            content: [
                                { type: 'output_text', text: 'fallback text' }
                            ]
                        }
                    ]
                }
            }
        ];

        const mockStream = asyncIter(events);
        const mockClientInst = {
            responses: {
                create: vi.fn().mockReturnValue({
                    withResponse: () =>
                        Promise.resolve({
                            data: mockStream,
                            response: { headers: {} }
                        })
                })
            }
        };
        (handler as unknown as Record<string, unknown>).createOpenAIClient = vi
            .fn()
            .mockResolvedValue(mockClientInst);

        await handler.handleRequest(
            makeModel(),
            makeModelConfig() as Parameters<typeof handler.handleRequest>[1],
            [],
            {} as vscode.ProvideLanguageModelChatResponseOptions,
            progress,
            makeToken()
        );

        const textParts = reportedParts.filter(
            (p) =>
                p instanceof vscode.LanguageModelTextPart &&
                (p as vscode.LanguageModelTextPart).value !== ''
        );
        const combined = textParts
            .map((p) => (p as vscode.LanguageModelTextPart).value)
            .join('');
        expect(combined).toContain('fallback text');
    });
});
