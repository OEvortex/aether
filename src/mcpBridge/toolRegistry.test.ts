import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = {
    tools: [] as Array<Record<string, unknown>>,
    extensions: [] as Array<Record<string, unknown>>
};

vi.mock('vscode', () => ({
    EventEmitter: class {
        private readonly listeners: Array<(data?: unknown) => void> = [];

        event = (listener: (data?: unknown) => void) => {
            this.listeners.push(listener);
            return { dispose() {} };
        };

        fire(data?: unknown) {
            for (const listener of this.listeners) {
                listener(data);
            }
        }

        dispose() {}
    },
    extensions: {
        get all() {
            return mockState.extensions;
        },
        onDidChange: vi.fn(() => ({ dispose() {} }))
    },
    lm: {
        get tools() {
            return mockState.tools;
        }
    }
}));

import { ToolRegistry } from './toolRegistry';
import type { FilterConfig } from './types';

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

describe('ToolRegistry', () => {
    let registry: ToolRegistry;

    beforeEach(() => {
        vi.clearAllMocks();
        mockState.tools = [
            {
                name: 'aether_testTool',
                description: 'Test tool description',
                inputSchema: {
                    type: 'object',
                    properties: {}
                },
                tags: ['alpha']
            }
        ];
        mockState.extensions = [
            {
                id: 'sample.extension',
                packageJSON: {
                    displayName: 'Sample Extension',
                    contributes: {
                        languageModelTools: [
                            {
                                name: 'aether_testTool',
                                description: 'Declared tool description',
                                icon: '$(tools)'
                            }
                        ]
                    }
                }
            }
        ];

        registry = createRegistry({
            includeTools: ['**'],
            excludeTools: [],
            includeExtensions: ['**'],
            excludeExtensions: []
        });
    });

    afterEach(() => {
        registry.dispose();
    });

    it('exposes allowed tools by default', () => {
        registry.refresh();

        const tool = registry.getTool('aether_testTool');
        expect(tool).toBeDefined();
        expect(tool?.exposed).toBe(true);
        expect(registry.getExposedTools()).toHaveLength(1);
    });

    it('preserves a manual hidden override across refreshes', () => {
        registry.refresh();

        registry.toggleTool('aether_testTool');
        expect(registry.getTool('aether_testTool')?.exposed).toBe(false);
        expect(registry.getExposedTools()).toHaveLength(0);

        registry.refresh();
        expect(registry.getTool('aether_testTool')?.exposed).toBe(false);
        expect(registry.getExposedTools()).toHaveLength(0);
    });

    it('applies explicit checkbox state without flipping back', () => {
        registry.refresh();

        registry.setToolExposed('aether_testTool', false);
        expect(registry.getTool('aether_testTool')?.exposed).toBe(false);

        registry.setToolExposed('aether_testTool', false);
        expect(registry.getTool('aether_testTool')?.exposed).toBe(false);

        registry.setToolExposed('aether_testTool', true);
        expect(registry.getTool('aether_testTool')?.exposed).toBe(true);
    });

    it('updates groups idempotently', () => {
        mockState.tools = [
            ...mockState.tools,
            {
                name: 'aether_secondTool',
                description: 'Second tool description',
                inputSchema: {
                    type: 'object',
                    properties: {}
                },
                tags: []
            }
        ];
        mockState.extensions = [
            {
                id: 'sample.extension',
                packageJSON: {
                    displayName: 'Sample Extension',
                    contributes: {
                        languageModelTools: [
                            {
                                name: 'aether_testTool',
                                description: 'Declared tool description',
                                icon: '$(tools)'
                            },
                            {
                                name: 'aether_secondTool',
                                description: 'Second declared tool description',
                                icon: '$(tools)'
                            }
                        ]
                    }
                }
            }
        ];
        registry.refresh();

        registry.setGroupExposed(
            ['aether_testTool', 'aether_secondTool'],
            false
        );
        expect(registry.getExposedTools()).toHaveLength(0);

        registry.setGroupExposed(
            ['aether_testTool', 'aether_secondTool'],
            false
        );
        expect(registry.getExposedTools()).toHaveLength(0);

        registry.setGroupExposed(['aether_testTool', 'aether_secondTool'], true);
        expect(registry.getExposedTools()).toHaveLength(2);
    });

    it('still hides tools excluded by filters', () => {
        registry = createRegistry({
            includeTools: ['**'],
            excludeTools: ['aether_testTool'],
            includeExtensions: ['**'],
            excludeExtensions: []
        });

        registry.refresh();

        expect(registry.getTool('aether_testTool')?.exposed).toBe(false);
        expect(registry.getExposedTools()).toHaveLength(0);
    });
});
