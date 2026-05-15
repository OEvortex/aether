import { describe, expect, it, vi } from 'vitest';

vi.mock('../../utils', () => ({
    getUserAgent: () => 'aether-test',
    Logger: {
        debug: vi.fn(),
        warn: vi.fn()
    }
}));

import { OpenCodeGoHandler } from './handler';

describe('OpenCodeGoHandler model parsing', () => {
    it('marks fetched DeepSeek thinking models for reasoning_content round-trip', () => {
        const handler = new OpenCodeGoHandler();
        const models = (handler as any).parseOpenCodeModels({
            'opencode-go': {
                models: {
                    'deepseek-v4-pro': {
                        name: 'DeepSeek V4 Pro'
                    },
                    'deepseek-v4-flash': {
                        name: 'DeepSeek V4 Flash'
                    },
                    'kimi-k2': {
                        name: 'Kimi K2'
                    }
                }
            }
        });

        expect(
            models.find(
                (model: { id: string }) => model.id === 'deepseek-v4-pro'
            )
        ).toMatchObject({
            includeThinking: true
        });
        expect(
            models.find(
                (model: { id: string }) => model.id === 'deepseek-v4-flash'
            )
        ).toMatchObject({
            includeThinking: true
        });
        expect(
            models.find((model: { id: string }) => model.id === 'kimi-k2')
        ).not.toHaveProperty('includeThinking');
    });
});
