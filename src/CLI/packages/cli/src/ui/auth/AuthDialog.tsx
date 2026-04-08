/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useState } from 'react';
import { Box, Text } from 'ink';
import { AuthType } from '@aether/aether-core';
import { DescriptiveRadioButtonSelect } from '../components/shared/DescriptiveRadioButtonSelect.js';
import { TextInput } from '../components/shared/TextInput.js';
import { useKeypress } from '../hooks/useKeypress.js';
import { theme } from '../semantic-colors.js';
import { useUIState } from '../contexts/UIStateContext.js';
import { useUIActions } from '../contexts/UIActionsContext.js';
import { useConfig } from '../contexts/ConfigContext.js';
import { t } from '../../i18n/index.js';

type ViewLevel = 'provider-select' | 'api-key-input';

const PROVIDER_ITEMS: Array<{
  key: string;
  title: string;
  label: string;
  description: string;
  value: AuthType;
}> = [
  {
    key: 'aether-oauth',
    title: t('Aether OAuth'),
    label: t('Aether OAuth'),
    description: t('Sign in with your Aether account'),
    value: AuthType.AETHER_OAUTH,
  },
  {
    key: 'openai',
    title: t('OpenAI'),
    label: t('OpenAI'),
    description: t('OpenAI-compatible API key'),
    value: AuthType.USE_OPENAI,
  },
  {
    key: 'anthropic',
    title: t('Anthropic'),
    label: t('Anthropic'),
    description: t('Anthropic API key'),
    value: AuthType.USE_ANTHROPIC,
  },
  {
    key: 'gemini',
    title: t('Gemini'),
    label: t('Gemini'),
    description: t('Gemini API key'),
    value: AuthType.USE_GEMINI,
  },
  {
    key: 'vertex-ai',
    title: t('Vertex AI'),
    label: t('Vertex AI'),
    description: t('Google Cloud Vertex AI credentials'),
    value: AuthType.USE_VERTEX_AI,
  },
] as const;

export function AuthDialog(): React.JSX.Element {
  const { authError } = useUIState();
  const { handleAuthSelect, onAuthError } = useUIActions();
  const config = useConfig();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewLevel, setViewLevel] = useState<ViewLevel>('provider-select');
  const [providerIndex, setProviderIndex] = useState<number>(0);
  const [selectedProvider, setSelectedProvider] = useState<AuthType | null>(
    null,
  );
  const [apiKey, setApiKey] = useState('');
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);

  const handleProviderSelect = async (value: AuthType) => {
    setErrorMessage(null);
    onAuthError(null);

    if (value === AuthType.AETHER_OAUTH) {
      await handleAuthSelect(value);
      return;
    }

    setSelectedProvider(value);
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

    if (!selectedProvider) {
      setErrorMessage(t('Select a provider first.'));
      return;
    }

    await handleAuthSelect(selectedProvider, { apiKey: trimmedKey });
  };

  const handleGoBack = () => {
    setErrorMessage(null);
    onAuthError(null);

    if (viewLevel === 'api-key-input') {
      setViewLevel('provider-select');
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
