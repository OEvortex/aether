/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAvailableModelsForAuthType,
  getOpenAIAvailableModelFromEnv,
} from './availableModels.js';
import { AuthType, type Config } from '@aetherai/aether-core';

describe('availableModels', () => {
  describe('getOpenAIAvailableModelFromEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return null when OPENAI_MODEL is not set', () => {
      delete process.env['OPENAI_MODEL'];
      expect(getOpenAIAvailableModelFromEnv()).toBeNull();
    });

    it('should return model from OPENAI_MODEL env var', () => {
      process.env['OPENAI_MODEL'] = 'gpt-4-turbo';
      const model = getOpenAIAvailableModelFromEnv();
      expect(model?.id).toBe('gpt-4-turbo');
      expect(model?.label).toBe('gpt-4-turbo');
    });

    it('should trim whitespace from env var', () => {
      process.env['OPENAI_MODEL'] = '  gpt-4  ';
      const model = getOpenAIAvailableModelFromEnv();
      expect(model?.id).toBe('gpt-4');
    });
  });

  describe('getAvailableModelsForAuthType', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('returns config models for openai when a config is provided', () => {
      const mockConfig = {
        getAvailableModelsForAuthType: vi.fn().mockReturnValue([
          {
            id: 'gpt-4',
            label: 'GPT-4',
            description: 'Test',
            authType: AuthType.USE_OPENAI,
            isVision: false,
          },
        ]),
      } as unknown as Config;

      const models = getAvailableModelsForAuthType(
        AuthType.USE_OPENAI,
        mockConfig,
      );

      expect(models).toEqual([
        {
          id: 'gpt-4',
          label: 'GPT-4',
          description: 'Test',
          isVision: false,
        },
      ]);
    });

    it('returns env model for openai without config', () => {
      process.env['OPENAI_MODEL'] = 'gpt-4-turbo';
      const models = getAvailableModelsForAuthType(AuthType.USE_OPENAI);
      expect(models[0].id).toBe('gpt-4-turbo');
    });

    it('returns empty array for unsupported auth types without config', () => {
      expect(getAvailableModelsForAuthType(AuthType.USE_GEMINI)).toEqual([]);
    });
  });
});
