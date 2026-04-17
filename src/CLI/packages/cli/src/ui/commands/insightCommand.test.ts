/**
 * @license
 * Copyright 2025 Qwen Code
 * SPDX-License-Identifier: Apache-2.0
 */

import { Storage } from '@aetherai/aether-core';
import open from 'open';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockCommandContext } from '../../test-utils/mockCommandContext.js';
import { insightCommand } from './insightCommand.js';
import type { CommandContext } from './types.js';

const mockGenerateStaticInsight = vi.fn();

vi.mock('../../services/insight/generators/StaticInsightGenerator.js', () => ({
    StaticInsightGenerator: vi.fn(() => ({
        generateStaticInsight: mockGenerateStaticInsight
    }))
}));

vi.mock('open', () => ({
    default: vi.fn()
}));

describe('insightCommand', () => {
    let mockContext: CommandContext;

    beforeEach(() => {
        Storage.setRuntimeBaseDir(path.resolve('runtime-output'));
        mockGenerateStaticInsight.mockResolvedValue(
            path.resolve(
                'runtime-output',
                'insights',
                'insight-2026-03-05.html'
            )
        );
        vi.mocked(open).mockResolvedValue(undefined as never);

        mockContext = createMockCommandContext({
            services: {
                config: {} as CommandContext['services']['config']
            },
            ui: {
                addItem: vi.fn(),
                setPendingItem: vi.fn(),
                setDebugMessage: vi.fn()
            }
        } as unknown as CommandContext);
    });

    afterEach(() => {
        Storage.setRuntimeBaseDir(null);
        vi.restoreAllMocks();
    });

    it('uses runtime base dir to locate projects directory', async () => {
        if (!insightCommand.action) {
            throw new Error('insight command must have action');
        }

        await insightCommand.action(mockContext, '');

        expect(mockGenerateStaticInsight).toHaveBeenCalledWith(
            path.join(Storage.getRuntimeBaseDir(), 'projects'),
            expect.any(Function)
        );
    });
});
