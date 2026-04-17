/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthType } from '@aetherai/aether-core';
import { vi } from 'vitest';
import { validateAuthMethod } from './auth.js';
import * as settings from './settings.js';

vi.mock('./settings.js', () => ({
    loadEnvironment: vi.fn(),
    loadSettings: vi.fn().mockReturnValue({
        merged: {}
    })
}));

function mockSettings(merged: Record<string, unknown>) {
    vi.mocked(settings.loadSettings).mockReturnValue({
        merged
    } as ReturnType<typeof settings.loadSettings>);
}

function createConfig(modelId: string) {
    return {
        getModelsConfig: vi.fn().mockReturnValue({
            getModel: vi.fn().mockReturnValue(modelId)
        })
    } as unknown as import('@aetherai/aether-core').Config;
}

describe('validateAuthMethod', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetAllMocks();
        mockSettings({});
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        delete process.env.OPENAI_API_KEY;
        delete process.env.CUSTOM_API_KEY;
        delete process.env.GEMINI_API_KEY;
        delete process.env.GEMINI_API_KEY_ALTERED;
        delete process.env.ANTHROPIC_API_KEY;
        delete process.env.ANTHROPIC_BASE_URL;
        delete process.env.GOOGLE_API_KEY;
        delete process.env.GOOGLE_GENAI_USE_VERTEXAI;
        delete process.env.SETTINGS_API_KEY;
        delete process.env.CLI_API_KEY;
    });

    it('returns null for USE_OPENAI when the default env key is set', () => {
        process.env.OPENAI_API_KEY = 'fake-key';
        expect(validateAuthMethod(AuthType.USE_OPENAI)).toBeNull();
    });

    it('falls back to settings.security.auth.apiKey for USE_OPENAI when env is missing', () => {
        mockSettings({
            security: { auth: { apiKey: 'fallback-key' } }
        });
        expect(validateAuthMethod(AuthType.USE_OPENAI)).toBeNull();
    });

    it('requires an explicit envKey when configured and does not fall back to apiKey', () => {
        mockSettings({
            model: { name: 'custom-model' },
            providers: {
                openai: {
                    models: [{ id: 'custom-model', envKey: 'CUSTOM_API_KEY' }]
                }
            },
            security: { auth: { apiKey: 'fallback-key' } }
        });

        const result = validateAuthMethod(AuthType.USE_OPENAI);
        expect(result).toContain('CUSTOM_API_KEY');
    });

    it('returns null for USE_OPENAI when explicit envKey is provided via providers', () => {
        mockSettings({
            model: { name: 'custom-model' },
            providers: {
                openai: {
                    models: [{ id: 'custom-model', envKey: 'CUSTOM_API_KEY' }]
                }
            }
        });
        process.env.CUSTOM_API_KEY = 'custom-key';

        expect(validateAuthMethod(AuthType.USE_OPENAI)).toBeNull();
    });

    it('returns null for AETHER_OAUTH', () => {
        expect(validateAuthMethod(AuthType.AETHER_OAUTH)).toBeNull();
    });

    it('returns an error message for an invalid auth method', () => {
        expect(validateAuthMethod('invalid-method')).toBe(
            'Invalid auth method selected.'
        );
    });

    it('returns null for USE_ANTHROPIC when provider model supplies baseUrl', () => {
        mockSettings({
            model: { name: 'claude-3' },
            providers: {
                anthropic: {
                    sdkMode: 'anthropic',
                    models: [
                        {
                            id: 'claude-3',
                            envKey: 'ANTHROPIC_API_KEY',
                            baseUrl: 'https://api.anthropic.com'
                        }
                    ]
                }
            }
        });
        process.env.ANTHROPIC_API_KEY = 'custom-anthropic-key';

        expect(validateAuthMethod(AuthType.USE_ANTHROPIC)).toBeNull();
    });

    it('errors for USE_ANTHROPIC when provider model is missing baseUrl even if env base URL exists', () => {
        mockSettings({
            model: { name: 'claude-3' },
            providers: {
                anthropic: {
                    sdkMode: 'anthropic',
                    models: [{ id: 'claude-3', envKey: 'ANTHROPIC_API_KEY' }]
                }
            }
        });
        process.env.ANTHROPIC_API_KEY = 'custom-key';
        process.env.ANTHROPIC_BASE_URL = 'https://example.com';

        const result = validateAuthMethod(AuthType.USE_ANTHROPIC);
        expect(result).toContain('baseUrl');
    });

    it('returns null for USE_ANTHROPIC when ANTHROPIC_BASE_URL is set and no provider model exists', () => {
        mockSettings({
            model: { name: 'claude-3' }
        });
        process.env.ANTHROPIC_API_KEY = 'custom-key';
        process.env.ANTHROPIC_BASE_URL = 'https://env-base-url';

        expect(validateAuthMethod(AuthType.USE_ANTHROPIC)).toBeNull();
    });

    it('returns null for USE_VERTEX_AI when default env key is set and sets vertex flag', () => {
        process.env.GOOGLE_API_KEY = 'vertex-key';

        expect(validateAuthMethod(AuthType.USE_VERTEX_AI)).toBeNull();
        expect(process.env.GOOGLE_GENAI_USE_VERTEXAI).toBe('true');
    });

    it('uses Config model selection when available', () => {
        mockSettings({
            model: { name: 'settings-model' },
            providers: {
                openai: {
                    models: [
                        { id: 'settings-model', envKey: 'SETTINGS_API_KEY' },
                        { id: 'cli-model', envKey: 'CLI_API_KEY' }
                    ]
                }
            }
        });

        const config = createConfig('cli-model');
        process.env.CLI_API_KEY = 'cli-key';

        const result = validateAuthMethod(AuthType.USE_OPENAI, config);
        expect(result).toBeNull();
        expect(config.getModelsConfig).toHaveBeenCalled();
    });
});
