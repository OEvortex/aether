import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock vscode
const mockTools = new Map<string, unknown>();
const mockInvokeToolResults = new Map<string, unknown>();

vi.mock('vscode', () => ({
    EventEmitter: class {
        private readonly listeners: Array<(data?: unknown) => void> = [];
        event = (listener: (data?: unknown) => void) => {
            this.listeners.push(listener);
            return { dispose() {} };
        };
        fire(data?: unknown) {
            for (const l of this.listeners) {
                l(data);
            }
        }
        dispose() {}
    },
    extensions: {
        all: [] as Array<Record<string, unknown>>,
        onDidChange: vi.fn(() => ({ dispose() {} }))
    },
    lm: {
        get tools() {
            return Array.from(mockTools.values());
        },
        invokeTool: vi.fn(
            async (
                name: string,
                options: { input: Record<string, unknown> },
                token?: unknown
            ) => {
                const result = mockInvokeToolResults.get(name);
                if (result === undefined) {
                    throw new Error(`No mock result for tool "${name}"`);
                }
                return result;
            }
        )
    },
    LanguageModelTextPart: class {
        constructor(public value: string) {}
    },
    LanguageModelPromptTsxPart: class {
        constructor(public value: unknown) {}
    },
    LanguageModelDataPart: class {
        mimeType: string;
        data: Uint8Array;
        constructor(data: Uint8Array, mimeType: string) {
            this.data = data;
            this.mimeType = mimeType;
        }
    },
    LanguageModelToolResult: class {
        content: unknown[];
        constructor(content: unknown[]) {
            this.content = content;
        }
    }
}));

// Mock filters
vi.mock('./filters', () => ({
    isToolAllowed: vi.fn(() => true),
    isExtensionAllowed: vi.fn(() => true)
}));

import { invokeLmTool } from './invocation';
import { ToolRegistry } from './toolRegistry';
import type { FilterConfig } from './types';

// VS Code classes from mock
class MockTextPart {
    constructor(public value: string) {}
}
class MockPromptTsxPart {
    constructor(public value: unknown) {}
}
class MockDataPart {
    mimeType: string;
    data: Uint8Array;
    constructor(data: Uint8Array, mimeType: string) {
        this.data = data;
        this.mimeType = mimeType;
    }
}

function createStorage() {
    const store = new Map<string, unknown>();
    return {
        get: vi.fn((key: string) => store.get(key)),
        update: vi.fn((key: string, value: unknown) => {
            store.set(key, value);
            return Promise.resolve();
        })
    } as unknown as import('vscode').Memento;
}

function createRegistry(filterConfig: FilterConfig) {
    const storage = createStorage();
    return new ToolRegistry(() => filterConfig, 1000, undefined, storage);
}

describe('invokeLmTool', () => {
    let registry: ToolRegistry;

    const defaultFilter: FilterConfig = {
        includeTools: ['**'],
        excludeTools: [],
        includeExtensions: ['**'],
        excludeExtensions: []
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockTools.clear();
        mockInvokeToolResults.clear();

        mockTools.set('test_tool', {
            name: 'test_tool',
            description: 'A test tool',
            inputSchema: { type: 'object', properties: {} },
            tags: []
        });

        registry = createRegistry(defaultFilter);
        registry.refresh();
    });

    afterEach(() => {
        registry.dispose();
    });

    it('returns error for unknown tool', async () => {
        const result = await invokeLmTool('nonexistent_tool', {}, registry);
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('not found');
    });

    it('converts LanguageModelTextPart correctly', async () => {
        mockInvokeToolResults.set('test_tool', {
            content: [new MockTextPart('Hello, world!')]
        });

        const result = await invokeLmTool('test_tool', {}, registry);
        expect(result.isError).toBe(false);
        expect(result.content).toHaveLength(1);
        expect(result.content[0]).toEqual({
            type: 'text',
            text: 'Hello, world!'
        });
    });

    it('converts LanguageModelPromptTsxPart with string value', async () => {
        mockInvokeToolResults.set('test_tool', {
            content: [new MockPromptTsxPart('rendered prompt text')]
        });

        const result = await invokeLmTool('test_tool', {}, registry);
        expect(result.isError).toBe(false);
        expect(result.content).toHaveLength(1);
        expect(result.content[0]).toEqual({
            type: 'text',
            text: 'rendered prompt text'
        });
    });

    it('converts LanguageModelPromptTsxPart with object value', async () => {
        const promptJson = {
            type: 'element',
            tag: 'body',
            children: [{ type: 'text', value: 'hello' }]
        };
        mockInvokeToolResults.set('test_tool', {
            content: [new MockPromptTsxPart(promptJson)]
        });

        const result = await invokeLmTool('test_tool', {}, registry);
        expect(result.isError).toBe(false);
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
        expect(JSON.parse((result.content[0] as { text: string }).text)).toEqual(
            promptJson
        );
    });

    it('converts LanguageModelDataPart image correctly', async () => {
        const imageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
        mockInvokeToolResults.set('test_tool', {
            content: [new MockDataPart(imageData, 'image/png')]
        });

        const result = await invokeLmTool('test_tool', {}, registry);
        expect(result.isError).toBe(false);
        expect(result.content).toHaveLength(1);
        expect(result.content[0]).toEqual({
            type: 'image',
            data: Buffer.from(imageData).toString('base64'),
            mimeType: 'image/png'
        });
    });

    it('converts LanguageModelDataPart non-image to text', async () => {
        const textData = new Uint8Array(
            Buffer.from('some data content', 'utf-8')
        );
        mockInvokeToolResults.set('test_tool', {
            content: [new MockDataPart(textData, 'application/json')]
        });

        const result = await invokeLmTool('test_tool', {}, registry);
        expect(result.isError).toBe(false);
        expect(result.content).toHaveLength(1);
        expect(result.content[0]).toEqual({
            type: 'text',
            text: 'some data content'
        });
    });

    it('handles mixed content types', async () => {
        const imageData = new Uint8Array([0xff, 0xd8]);
        mockInvokeToolResults.set('test_tool', {
            content: [
                new MockTextPart('Here is the result:'),
                new MockDataPart(imageData, 'image/jpeg'),
                new MockTextPart('Done.')
            ]
        });

        const result = await invokeLmTool('test_tool', {}, registry);
        expect(result.isError).toBe(false);
        expect(result.content).toHaveLength(3);
        expect(result.content[0]).toEqual({
            type: 'text',
            text: 'Here is the result:'
        });
        expect(result.content[1]).toEqual({
            type: 'image',
            data: Buffer.from(imageData).toString('base64'),
            mimeType: 'image/jpeg'
        });
        expect(result.content[2]).toEqual({
            type: 'text',
            text: 'Done.'
        });
    });

    it('handles ExtendedLanguageModelToolResult hasError', async () => {
        mockInvokeToolResults.set('test_tool', {
            content: [new MockTextPart('partial result')],
            hasError: true,
            toolResultMessage: 'Tool timed out'
        });

        const result = await invokeLmTool('test_tool', {}, registry);
        expect(result.isError).toBe(false);
        expect(result.hasError).toBe(true);
        // The error message should be prepended
        expect(result.content[0]).toEqual({
            type: 'text',
            text: '[Tool Error]: Tool timed out'
        });
        expect(result.content[1]).toEqual({
            type: 'text',
            text: 'partial result'
        });
    });

    it('skips null/undefined content parts', async () => {
        mockInvokeToolResults.set('test_tool', {
            content: [null, undefined, new MockTextPart('valid'), null]
        });

        const result = await invokeLmTool('test_tool', {}, registry);
        expect(result.isError).toBe(false);
        expect(result.content).toHaveLength(1);
        expect(result.content[0]).toEqual({
            type: 'text',
            text: 'valid'
        });
    });

    it('passes input correctly to invokeTool', async () => {
        mockInvokeToolResults.set('test_tool', {
            content: [new MockTextPart('ok')]
        });
        const { lm } = await import('vscode');

        const input = { query: 'test search', count: 5 };
        await invokeLmTool('test_tool', input, registry);

        expect(lm.invokeTool).toHaveBeenCalledWith(
            'test_tool',
            { input, toolInvocationToken: undefined },
            undefined
        );
    });

    it('records invocation count on success', async () => {
        mockInvokeToolResults.set('test_tool', {
            content: [new MockTextPart('ok')]
        });

        expect(registry.getTool('test_tool')?.invocationCount).toBe(0);
        await invokeLmTool('test_tool', {}, registry);
        expect(registry.getTool('test_tool')?.invocationCount).toBe(1);
        await invokeLmTool('test_tool', {}, registry);
        expect(registry.getTool('test_tool')?.invocationCount).toBe(2);
    });

    it('returns error content when invokeTool throws', async () => {
        mockInvokeToolResults.set('test_tool', undefined);
        // Override to throw
        const { lm } = await import('vscode');
        vi.mocked(lm.invokeTool).mockRejectedValueOnce(
            new Error('Tool crashed')
        );

        const result = await invokeLmTool('test_tool', {}, registry);
        expect(result.isError).toBe(true);
        expect((result.content[0] as { type: string; text: string }).text).toContain('Tool crashed');
    });

    it('handles unknown part types gracefully', async () => {
        // Simulate a new/unknown content type
        const unknownPart = { type: 'custom_type', data: 'something' };
        mockInvokeToolResults.set('test_tool', {
            content: [unknownPart]
        });

        const result = await invokeLmTool('test_tool', {}, registry);
        expect(result.isError).toBe(false);
        // Should serialize as JSON text
        expect(result.content).toHaveLength(1);
        expect(result.content[0].type).toBe('text');
    });

    it('handles non-array content gracefully', async () => {
        mockInvokeToolResults.set('test_tool', {
            content: 'not an array'
        });

        const result = await invokeLmTool('test_tool', {}, registry);
        expect(result.isError).toBe(false);
        expect(result.content).toHaveLength(0);
    });
});
