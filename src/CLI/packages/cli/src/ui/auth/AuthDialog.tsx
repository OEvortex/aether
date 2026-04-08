/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useState } from 'react';
import { Box, Text } from 'ink';
import { DescriptiveRadioButtonSelect } from '../components/shared/DescriptiveRadioButtonSelect.js';
import { TextInput } from '../components/shared/TextInput.js';
import { useKeypress } from '../hooks/useKeypress.js';
import { theme } from '../semantic-colors.js';
import { useUIState } from '../contexts/UIStateContext.js';
import { useUIActions } from '../contexts/UIActionsContext.js';
import { useConfig } from '../contexts/ConfigContext.js';
import { useSettings } from '../contexts/SettingsContext.js';
import { getPersistScopeForModelSelection } from '../../config/modelProvidersScope.js';
import { t } from '../../i18n/index.js';
import { KnownProviders } from '../../../../../../utils/knownProvidersData.js';
import {
  buildProviderModelProvidersConfig,
  getProviderAuthType,
  getProviderBaseUrl,
} from './providerSelection.js';

type ViewLevel = 'provider-select' | 'api-key-input';

type ProviderChoice = {
  key: string;
  title: string;
  label: string;
  description: string;
  value: string;
};

const PROVIDER_ITEMS: ProviderChoice[] = [
  ...Object.entries(KnownProviders).map(([providerId, provider]) => ({
    key: providerId,
    title: provider.displayName,
    label: provider.displayName,
    description:
      provider.description ||
      (provider.supportsApiKey === false
        ? t('No API key required')
        : provider.fetchModels
          ? t('API key and live models')
          : t('API key required')),
    value: providerId,
  })),
];

export function AuthDialog(): React.JSX.Element {
  const { authError } = useUIState();
  const { handleAuthSelect, onAuthError } = useUIActions();
  const config = useConfig();
  const settings = useSettings();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewLevel, setViewLevel] = useState<ViewLevel>('provider-select');
  const [providerIndex, setProviderIndex] = useState<number>(() => {
    const selectedProvider = settings.merged.security?.auth?.selectedProvider;
    if (!selectedProvider) {
      return 0;
    }
    const index = PROVIDER_ITEMS.findIndex(
      (item) => item.value === selectedProvider,
    );
    return index === -1 ? 0 : index;
  });
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    null,
  );
  const [apiKey, setApiKey] = useState('');
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  const handleProviderSelect = async (value: string) => {
    setErrorMessage(null);
    onAuthError(null);

    const provider = KnownProviders[value];
    if (!provider) {
      setErrorMessage(t('Unknown provider selected.'));
      return;
    }

    const authType = getProviderAuthType(value);
    const providerModelProviders = buildProviderModelProvidersConfig(value);
    const scope = getPersistScopeForModelSelection(settings);
    const currentProvider = settings.merged.security?.auth?.selectedProvider;
    const currentConfig = config.getContentGeneratorConfig();
    const currentApiKey = currentConfig?.apiKey?.trim();

    settings.setValue(scope, 'security.auth.selectedProvider', value);
    if (providerModelProviders) {
      settings.setValue(scope, `modelProviders.${authType}`, providerModelProviders[authType]);
    }

    if (
      provider.supportsApiKey === false ||
      (currentProvider === value && !!currentApiKey)
    ) {
      await handleAuthSelect(authType, {
        providerId: value,
        apiKey: currentApiKey,
      });
      return;
    }

    setSelectedProviderId(value);
    setApiKey('');
    setApiKeyError(null);
    setViewLevel('api-key-input');
  };

  const handleApiKeySubmit = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setApiKeyError(t('API key cannot be empty.'));
      return;
    }

    if (!selectedProviderId) {
      setErrorMessage(t('Select a provider first.'));
      return;
    }

    await handleAuthSelect(getProviderAuthType(selectedProviderId), {
      apiKey: trimmedKey,
      baseUrl: getProviderBaseUrl(selectedProviderId),
      providerId: selectedProviderId,
    });
  };

  const handleGoBack = () => {
    setErrorMessage(null);
    onAuthError(null);

    if (viewLevel === 'api-key-input') {
      setViewLevel('provider-select');
      setSelectedProviderId(null);
      setApiKeyError(null);
      return;
    }

    if (config.getAuthType() === undefined) {
      setErrorMessage(t('You must select an auth method before exiting.'));
      return;
    }

    void handleAuthSelect(undefined);
  };

  useKeypress(
    (key) => {
      if (key.name === 'escape') {
        handleGoBack();
      }
    },
    { isActive: true },
  );

  const renderProviderSelectView = () => (
    <>
      <Box marginTop={1}>
        <DescriptiveRadioButtonSelect
          items={PROVIDER_ITEMS}
          initialIndex={providerIndex}
          onSelect={handleProviderSelect}
          onHighlight={(value) => {
            const index = PROVIDER_ITEMS.findIndex((item) => item.value === value);
            setProviderIndex(index);
          }}
          itemGap={1}
        />
      </Box>
      <Box marginTop={1}>
        <Text color={theme?.text?.secondary}>
          {t('Enter to select, ↑↓ to navigate, Esc to go back')}
        </Text>
      </Box>
    </>
  );

  const renderApiKeyInputView = () => (
    <Box marginTop={1} flexDirection="column">
      <Box marginTop={1}>
        <Text color={theme.text.secondary}>
          {t('Enter the API key for the selected provider')}
        </Text>
      </Box>
      <Box marginTop={1}>
        <TextInput
          value={apiKey}
          onChange={(value) => {
            setApiKey(value);
            if (apiKeyError) {
              setApiKeyError(null);
            }
          }}
          onSubmit={handleApiKeySubmit}
          placeholder="sk-..."
        />
      </Box>
      {apiKeyError && (
        <Box marginTop={1}>
          <Text color={theme.status.error}>{apiKeyError}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color={theme.text.secondary}>
          {t('Enter to submit, Esc to go back')}
        </Text>
      </Box>
    </Box>
  );

  const getViewTitle = () =>
    viewLevel === 'provider-select'
      ? t('Choose Provider')
      : t('Enter API Key');

  return (
    <Box
      borderStyle="single"
      borderColor={theme?.border?.default}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold>{getViewTitle()}</Text>

      {viewLevel === 'provider-select' && renderProviderSelectView()}
      {viewLevel === 'api-key-input' && renderApiKeyInputView()}

      {(authError || errorMessage) && (
        <Box marginTop={1}>
          <Text color={theme.status.error}>{authError || errorMessage}</Text>
        </Box>
      )}
    </Box>
  );
}
