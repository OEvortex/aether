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

    it('rejects Git LFS pointer files when resolving the vendored BPE encoder', async () => {
        // Regression test for:
        //   "Failed to load from BPE encoder file stream:
        //    Can't parse https://git-lfs.github.com/spec/v1 to integer"
        //
        // The vendored o200k_base.tiktoken was previously a 132-byte
        // Git LFS pointer (e.g. on machines without `git-lfs` installed).
        // We must never feed that pointer text to the BPE parser.
        const { isValidBpeFile, resolveVendoredEncoderPath } = await import(
            './tokenCounter'
        );

        const fs = await import('node:fs');
        const os = await import('node:os');
        const path = await import('node:path');

        const tmpDir = fs.mkdtempSync(
            path.join(os.tmpdir(), 'tokenCounter-lfs-')
        );
        try {
            // 1. Pure LFS pointer file (the historical bug shape).
            const lfsPointerPath = path.join(tmpDir, 'lfs_pointer.tiktoken');
            fs.writeFileSync(
                lfsPointerPath,
                [
                    'version https://git-lfs.github.com/spec/v1',
                    'oid sha256:446a9538cb6c348e3516120d7c08b09f57c36495e2acfffe59a5bf8b0cfb1a2d',
                    'size 3613922',
                    ''
                ].join('\n')
            );
            expect(isValidBpeFile(lfsPointerPath)).toBe(false);
            expect(resolveVendoredEncoderPath('lfs_pointer')).toBeNull();

            // 2. Truncated BPE file (first line cuts off the rank).
            const truncatedPath = path.join(tmpDir, 'truncated.tiktoken');
            fs.writeFileSync(truncatedPath, 'IQ== 0\nIg==\n');
            expect(isValidBpeFile(truncatedPath)).toBe(false);

            // 3. Garbage / non-BPE file.
            const garbagePath = path.join(tmpDir, 'garbage.tiktoken');
            fs.writeFileSync(
                garbagePath,
                'this is not a tiktoken file at all, just plain text content'
            );
            expect(isValidBpeFile(garbagePath)).toBe(false);

            // 4. Nonexistent file.
            expect(
                isValidBpeFile(path.join(tmpDir, 'does_not_exist.tiktoken'))
            ).toBe(false);

            // 5. Real-shaped BPE header (first line = `<b64> <int>`).
            // The size guard inside `isValidBpeFile` requires a non-trivial
            // file (>150 bytes) to reject Git LFS pointers (132 bytes),
            // so we pad the body to match a real BPE dump's footprint.
            const realPath = path.join(tmpDir, 'real.tiktoken');
            const realHeader = 'IQ== 0\nIg== 1\nIw== 2\n';
            const realBody = 'x'.repeat(2048);
            fs.writeFileSync(realPath, realHeader + realBody + '\n');
            expect(isValidBpeFile(realPath)).toBe(true);
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });
});
