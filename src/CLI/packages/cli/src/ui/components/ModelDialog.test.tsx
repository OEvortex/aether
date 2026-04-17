/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Config } from '@aetherai/aether-core';
import { AuthType } from '@aetherai/aether-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoadedSettings } from '../../config/settings.js';
import { SettingScope } from '../../config/settings.js';
import { renderWithProviders } from '../../test-utils/render.js';
import { ConfigContext } from '../contexts/ConfigContext.js';
import { SettingsContext } from '../contexts/SettingsContext.js';
import { useKeypress } from '../hooks/useKeypress.js';
import { ModelDialog } from './ModelDialog.js';
import { DescriptiveRadioButtonSelect } from './shared/DescriptiveRadioButtonSelect.js';

vi.mock('../hooks/useKeypress.js', () => ({
    useKeypress: vi.fn()
}));
const mockedUseKeypress = vi.mocked(useKeypress);

vi.mock('./shared/DescriptiveRadioButtonSelect.js', () => ({
    DescriptiveRadioButtonSelect: vi.fn(() => null)
}));
const mockedSelect = vi.mocked(DescriptiveRadioButtonSelect);

const makeModels = (authType: AuthType) => [
    {
        id: 'gpt-4o',
        label: 'GPT-4o',
        description: 'OpenAI flagship model',
        authType,
        baseUrl: 'https://api.openai.com/v1',
        envKey: 'OPENAI_API_KEY'
    },
    {
        id: 'gpt-4o-mini',
        label: 'GPT-4o mini',
        description: 'Small fast model',
        authType,
        baseUrl: 'https://api.openai.com/v1',
        envKey: 'OPENAI_API_KEY',
        isRuntimeModel: true,
        runtimeSnapshotId: '$runtime|openai|gpt-4o-mini'
    }
];

const renderComponent = (
    props: Partial<React.ComponentProps<typeof ModelDialog>> = {},
    contextValue: Partial<Config> | undefined = undefined
) => {
    const defaultProps = {
        onClose: vi.fn()
    };
    const combinedProps = { ...defaultProps, ...props };

    const mockSettings = {
        isTrusted: true,
        user: { settings: {} },
        workspace: { settings: {} },
        setValue: vi.fn()
    } as unknown as LoadedSettings;

    const mockConfig = {
        getModel: vi.fn(() => 'gpt-4o'),
        getAuthType: vi.fn(() => AuthType.USE_OPENAI),
        getContentGeneratorConfig: vi.fn(() => ({
            authType: AuthType.USE_OPENAI,
            model: 'gpt-4o'
        })),
        getAvailableModelsForAuthType: vi.fn((t: AuthType) =>
            t === AuthType.USE_OPENAI ? makeModels(t) : []
        ),
        getActiveRuntimeModelSnapshot: vi.fn(() => undefined),
        switchModel: vi.fn().mockResolvedValue(undefined),
        ...(contextValue ?? {})
    } as unknown as Config;

    const renderResult = renderWithProviders(
        <SettingsContext.Provider value={mockSettings}>
            <ConfigContext.Provider value={mockConfig}>
                <ModelDialog {...combinedProps} />
            </ConfigContext.Provider>
        </SettingsContext.Provider>,
        { settings: mockSettings, config: mockConfig }
    );

    return {
        ...renderResult,
        props: combinedProps,
        mockConfig,
        mockSettings
    };
};

describe('<ModelDialog />', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        // no-op
    });

    it('renders only current provider models', () => {
        renderComponent();

        expect(mockedSelect).toHaveBeenCalledTimes(1);
        const props = mockedSelect.mock.calls[0][0];
        expect(props.items).toHaveLength(2);
        expect(props.items[0].value).toBe('gpt-4o');
    });

    it('initializes with the current model from config', () => {
        renderComponent();

        expect(mockedSelect).toHaveBeenCalledWith(
            expect.objectContaining({
                initialIndex: 0
            }),
            undefined
        );
    });

    it('switches to the selected provider model', async () => {
        const { props, mockConfig, mockSettings } = renderComponent();
        const childOnSelect = mockedSelect.mock.calls[0][0].onSelect;

        await childOnSelect('gpt-4o-mini');

        expect(mockConfig.switchModel).toHaveBeenCalledWith(
            AuthType.USE_OPENAI,
            'gpt-4o-mini',
            undefined
        );
        expect(mockSettings.setValue).toHaveBeenCalledWith(
            SettingScope.User,
            'model.name',
            'gpt-4o-mini'
        );
        expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it('shows runtime model details when highlighted', () => {
        renderComponent();

        const childOnHighlight = mockedSelect.mock.calls[0][0].onHighlight;
        childOnHighlight('gpt-4o-mini');
        expect(childOnHighlight).toBeDefined();
    });

    it('closes on escape', () => {
        const { props } = renderComponent();

        const keyPressHandler = mockedUseKeypress.mock.calls[0][0];
        keyPressHandler({
            name: 'escape',
            ctrl: false,
            meta: false,
            shift: false,
            paste: false,
            sequence: ''
        });

        expect(props.onClose).toHaveBeenCalledTimes(1);
    });
});
