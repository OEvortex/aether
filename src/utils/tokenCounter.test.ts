import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => {
    class LanguageModelTextPart {
        constructor(public value: string) {}
    }

    class LanguageModelToolCallPart {
        constructor(
            public callId: string,
            public name: string,
            public input: unknown
        ) {}
    }

    class LanguageModelToolResultPart {
        constructor(
            public callId: string,
            public content: unknown[]
        ) {}
    }

    class LanguageModelToolResultPart2 {
        constructor(
            public callId: string,
            public content: unknown[]
        ) {}
    }

    class LanguageModelPromptTsxPart {
        constructor(public value: unknown) {}
    }

    class LanguageModelDataPart {
        constructor(
            public data: Uint8Array,
            public mimeType: string
        ) {}
    }

    class LanguageModelThinkingPart {
        constructor(public value: string | string[]) {}
    }

    return {
        LanguageModelTextPart,
        LanguageModelToolCallPart,
        LanguageModelToolResultPart,
        LanguageModelToolResultPart2,
        LanguageModelPromptTsxPart,
        LanguageModelDataPart,
        LanguageModelThinkingPart,
        LanguageModelChatMessageRole: {
            User: 'user',
            Assistant: 'assistant',
            System: 'system'
        }
    };
});

import * as vscode from 'vscode';
import { TokenCounter } from './tokenCounter';

describe('TokenCounter', () => {
    it('counts modern LM message parts used by the context window panel', async () => {
        const tokenizer = {
            encode(text: string) {
                return Array.from(text);
            }
        };

        const counter = new TokenCounter(tokenizer as never);
        const message = {
            role: vscode.LanguageModelChatMessageRole.User,
            content: [
                new vscode.LanguageModelTextPart('hello'),
                new vscode.LanguageModelToolResultPart2('call-1', [
                    new vscode.LanguageModelTextPart('tool text'),
                    new vscode.LanguageModelPromptTsxPart({ answer: 42 }),
                    new vscode.LanguageModelDataPart(
                        new TextEncoder().encode('{"ok":true}'),
                        'application/json'
                    )
                ]),
                new vscode.LanguageModelDataPart(
                    new TextEncoder().encode('plain text payload'),
                    'text/plain'
                ),
                new vscode.LanguageModelThinkingPart(['step one', 'step two'])
            ]
        };

        const total = await counter.countTokens(
            { id: 'test-model' } as never,
            message
        );

        expect(total).toBeGreaterThan(20);
    });

    it('includes tool result v2 and text-like data parts in total message counts', async () => {
        const tokenizer = {
            encode(text: string) {
                return Array.from(text);
            }
        };

        const counter = new TokenCounter(tokenizer as never);
        const messages = [
            {
                role: vscode.LanguageModelChatMessageRole.System,
                content: [new vscode.LanguageModelTextPart('system rule')]
            },
            {
                role: vscode.LanguageModelChatMessageRole.User,
                content: [
                    new vscode.LanguageModelToolResultPart2('call-2', [
                        new vscode.LanguageModelTextPart('result'),
                        new vscode.LanguageModelDataPart(
                            new TextEncoder().encode('extra'),
                            'text/plain'
                        )
                    ])
                ]
            }
        ];

        const total = await counter.countMessagesTokens(
            { id: 'test-model' } as never,
            messages,
            { sdkMode: 'anthropic' }
        );

        expect(total).toBeGreaterThan(40);
    });
});
