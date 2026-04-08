/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useState } from 'react';
import { Box, Text } from 'ink';
import Link from 'ink-link';
import { theme } from '../semantic-colors.js';
import { useKeypress } from '../hooks/useKeypress.js';
import { DescriptiveRadioButtonSelect } from '../components/shared/DescriptiveRadioButtonSelect.js';
import { ApiKeyInput } from '../components/ApiKeyInput.js';
import { TextInput } from '../components/shared/TextInput.js';
import { useUIState } from '../contexts/UIStateContext.js';
import { useUIActions } from '../contexts/UIActionsContext.js';
import { t } from '../../i18n/index.js';
import { CodingPlanRegion } from '../../constants/codingPlan.js';
import {
  ALIBABA_STANDARD_API_KEY_ENDPOINTS,
  type AlibabaStandardRegion,
} from '../../constants/alibabaStandardApiKey.js';

const MODEL_PROVIDERS_DOCUMENTATION_URL =
  'https://OEvortex.github.io/aether-docs/en/users/configuration/model-providers/';

// API Key option type
type ApiKeyOption = 'ALIBABA_STANDARD_API_KEY' | 'CUSTOM_API_KEY';

// View level for navigation
type ViewLevel =
  | 'main'
  | 'region-select'
  | 'api-key-input'
  | 'api-key-type-select'
  | 'alibaba-standard-region-select'
  | 'alibaba-standard-api-key-input'
  | 'alibaba-standard-model-id-input'
  | 'custom-info';

const ALIBABA_STANDARD_MODEL_IDS_PLACEHOLDER = 'aether3.5-plus,glm-5,kimi-k2.5';
const ALIBABA_STANDARD_API_DOCUMENTATION_URLS: Record<
  AlibabaStandardRegion,
  string
> = {
  'cn-beijing': 'https://bailian.console.aliyun.com/cn-beijing?tab=api#/api',
  'sg-singapore':
    'https://modelstudio.console.alibabacloud.com/ap-southeast-1?tab=api#/api/?type=model&url=2712195',
  'us-virginia':
    'https://modelstudio.console.alibabacloud.com/us-east-1?tab=api#/api/?type=model&url=2712195',
  'cn-hongkong':
    'https://modelstudio.console.alibabacloud.com/cn-hongkong?tab=api#/api/?type=model&url=2712195',
};

export function AuthDialog(): React.JSX.Element {
    const { authError } = useUIState();
    const {
    handleCodingPlanSubmit,
    handleAlibabaStandardSubmit,
    onAuthError,
  } = useUIActions();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
    // Start directly at API key type selection since we only support API Key
    const [viewLevel, setViewLevel] = useState<ViewLevel>('api-key-type-select');
  const [regionIndex, setRegionIndex] = useState<number>(0);
  const [region, setRegion] = useState<CodingPlanRegion>(
    CodingPlanRegion.CHINA,
  );
  const [alibabaStandardRegionIndex, setAlibabaStandardRegionIndex] =
    useState<number>(0);
  const [apiKeyTypeIndex, setApiKeyTypeIndex] = useState<number>(0);
  const [alibabaStandardRegion, setAlibabaStandardRegion] =
    useState<AlibabaStandardRegion>('cn-beijing');
  const [alibabaStandardApiKey, setAlibabaStandardApiKey] = useState('');
  const [alibabaStandardApiKeyError, setAlibabaStandardApiKeyError] = useState<
    string | null
  >(null);
  const [alibabaStandardModelId, setAlibabaStandardModelId] = useState('');
  const [alibabaStandardModelIdError, setAlibabaStandardModelIdError] =
    useState<string | null>(null);

  // Region selection entries (shown after selecting Alibaba Cloud Coding Plan)
  const regionItems = [
    {
      key: 'china',
      title: '阿里云百炼 (aliyun.com)',
      label: '阿里云百炼 (aliyun.com)',
      description: (
        <Link
          url="https://help.aliyun.com/zh/model-studio/coding-plan"
          fallback={false}
        >
          <Text color={theme.text.secondary}>
            https://help.aliyun.com/zh/model-studio/coding-plan
          </Text>
        </Link>
      ),
      value: CodingPlanRegion.CHINA,
    },
    {
      key: 'global',
      title: 'Alibaba Cloud (alibabacloud.com)',
      label: 'Alibaba Cloud (alibabacloud.com)',
      description: (
        <Link
          url="https://www.alibabacloud.com/help/en/model-studio/coding-plan"
          fallback={false}
        >
          <Text color={theme.text.secondary}>
            https://www.alibabacloud.com/help/en/model-studio/coding-plan
          </Text>
        </Link>
      ),
      value: CodingPlanRegion.GLOBAL,
    },
  ];

  const alibabaStandardRegionItems = [
    {
      key: 'cn-beijing',
      title: t('China (Beijing)'),
      label: t('China (Beijing)'),
      description: (
        <Text color={theme.text.secondary}>
          Endpoint: {ALIBABA_STANDARD_API_KEY_ENDPOINTS['cn-beijing']}
        </Text>
      ),
      value: 'cn-beijing' as AlibabaStandardRegion,
    },
    {
      key: 'sg-singapore',
      title: t('Singapore'),
      label: t('Singapore'),
      description: (
        <Text color={theme.text.secondary}>
          Endpoint: {ALIBABA_STANDARD_API_KEY_ENDPOINTS['sg-singapore']}
        </Text>
      ),
      value: 'sg-singapore' as AlibabaStandardRegion,
    },
    {
      key: 'us-virginia',
      title: t('US (Virginia)'),
      label: t('US (Virginia)'),
      description: (
        <Text color={theme.text.secondary}>
          Endpoint: {ALIBABA_STANDARD_API_KEY_ENDPOINTS['us-virginia']}
        </Text>
      ),
      value: 'us-virginia' as AlibabaStandardRegion,
    },
    {
      key: 'cn-hongkong',
      title: t('China (Hong Kong)'),
      label: t('China (Hong Kong)'),
      description: (
        <Text color={theme.text.secondary}>
          Endpoint: {ALIBABA_STANDARD_API_KEY_ENDPOINTS['cn-hongkong']}
        </Text>
      ),
      value: 'cn-hongkong' as AlibabaStandardRegion,
    },
  ];

  const apiKeyTypeItems = [
    {
      key: 'ALIBABA_STANDARD_API_KEY',
      title: t('Alibaba Cloud ModelStudio Standard API Key'),
      label: t('Alibaba Cloud ModelStudio Standard API Key'),
      description: t('Quick setup for Model Studio (China/International)'),
      value: 'ALIBABA_STANDARD_API_KEY' as ApiKeyOption,
    },
    {
      key: 'CUSTOM_API_KEY',
      title: t('Custom API Key'),
      label: t('Custom API Key'),
      description: t(
        'For other OpenAI / Anthropic / Gemini-compatible providers',
      ),
      value: 'CUSTOM_API_KEY' as ApiKeyOption,
    },
  ];

  const handleApiKeyTypeSelect = async (value: ApiKeyOption) => {
    setErrorMessage(null);
    onAuthError(null);

    if (value === 'ALIBABA_STANDARD_API_KEY') {
      setAlibabaStandardModelIdError(null);
      setAlibabaStandardApiKeyError(null);
      setViewLevel('alibaba-standard-region-select');
      return;
    }

    setViewLevel('custom-info');
  };

  const handleRegionSelect = async (selectedRegion: CodingPlanRegion) => {
    setErrorMessage(null);
    onAuthError(null);
    setRegion(selectedRegion);
    setViewLevel('api-key-input');
  };

  const handleAlibabaStandardRegionSelect = async (
    selectedRegion: AlibabaStandardRegion,
  ) => {
    setErrorMessage(null);
    onAuthError(null);
    setAlibabaStandardApiKeyError(null);
    setAlibabaStandardModelIdError(null);
    setAlibabaStandardRegion(selectedRegion);
    setViewLevel('alibaba-standard-api-key-input');
  };

  const handleApiKeyInputSubmit = async (apiKey: string) => {
    setErrorMessage(null);

    if (!apiKey.trim()) {
      setErrorMessage(t('API key cannot be empty.'));
      return;
    }

    // Submit to parent for processing with region info
    await handleCodingPlanSubmit(apiKey, region);
  };

  const handleAlibabaStandardApiKeySubmit = () => {
    const trimmedKey = alibabaStandardApiKey.trim();
    if (!trimmedKey) {
      setAlibabaStandardApiKeyError(t('API key cannot be empty.'));
      return;
    }

    setAlibabaStandardApiKeyError(null);
    if (!alibabaStandardModelId.trim()) {
      setAlibabaStandardModelId(ALIBABA_STANDARD_MODEL_IDS_PLACEHOLDER);
    }
    setViewLevel('alibaba-standard-model-id-input');
  };

  const handleAlibabaStandardModelSubmit = () => {
    const trimmedApiKey = alibabaStandardApiKey.trim();
    const trimmedModelIds = alibabaStandardModelId.trim();
    if (!trimmedApiKey) {
      setAlibabaStandardApiKeyError(t('API key cannot be empty.'));
      setViewLevel('alibaba-standard-api-key-input');
      return;
    }
    if (!trimmedModelIds) {
      setAlibabaStandardModelIdError(t('Model IDs cannot be empty.'));
      return;
    }

    setAlibabaStandardModelIdError(null);
    void handleAlibabaStandardSubmit(
      trimmedApiKey,
      alibabaStandardRegion,
      trimmedModelIds,
    );
  };

  const handleGoBack = () => {
    setErrorMessage(null);
    onAuthError(null);

    if (viewLevel === 'region-select') {
        // Go back to API key type selection
        setViewLevel('api-key-type-select');
    } else if (viewLevel === 'api-key-input') {
      setViewLevel('region-select');
    } else if (viewLevel === 'api-key-type-select') {
        // Exit - at root API key selection
        process.exit(0);
    } else if (viewLevel === 'custom-info') {
      setViewLevel('api-key-type-select');
    } else if (viewLevel === 'alibaba-standard-region-select') {
      setViewLevel('api-key-type-select');
    } else if (viewLevel === 'alibaba-standard-api-key-input') {
      setViewLevel('alibaba-standard-region-select');
    } else if (viewLevel === 'alibaba-standard-model-id-input') {
      setViewLevel('alibaba-standard-api-key-input');
    }
  };

  useKeypress(
    (key) => {
          if (key.name === 'escape') {
          handleGoBack();
      }
    },
    { isActive: true },
  );

    // Render API key type selection directly
  const renderRegionSelectView = () => (
    <>
      <Box marginTop={1}>
        <Text color={theme.text.primary}>
          {t('Choose based on where your account is registered')}
        </Text>
      </Box>
      <Box marginTop={1}>
        <DescriptiveRadioButtonSelect
          items={regionItems}
          initialIndex={regionIndex}
          onSelect={handleRegionSelect}
          onHighlight={(value) => {
            const index = regionItems.findIndex((item) => item.value === value);
            setRegionIndex(index);
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

  // Render API key input for coding-plan mode
  const renderApiKeyInputView = () => (
    <Box marginTop={1}>
      <ApiKeyInput
        onSubmit={handleApiKeyInputSubmit}
        onCancel={handleGoBack}
        region={region}
      />
    </Box>
  );

  const renderApiKeyTypeSelectView = () => (
    <>
      <Box marginTop={1}>
        <DescriptiveRadioButtonSelect
          items={apiKeyTypeItems}
          initialIndex={apiKeyTypeIndex}
          onSelect={handleApiKeyTypeSelect}
          onHighlight={(value) => {
            const index = apiKeyTypeItems.findIndex(
              (item) => item.value === value,
            );
            setApiKeyTypeIndex(index);
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

  const renderAlibabaStandardRegionSelectView = () => (
    <>
      <Box marginTop={1}>
        <DescriptiveRadioButtonSelect
          items={alibabaStandardRegionItems}
          initialIndex={alibabaStandardRegionIndex}
          onSelect={handleAlibabaStandardRegionSelect}
          onHighlight={(value) => {
            const index = alibabaStandardRegionItems.findIndex(
              (item) => item.value === value,
            );
            setAlibabaStandardRegionIndex(index);
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

  const renderAlibabaStandardApiKeyInputView = () => (
    <Box marginTop={1} flexDirection="column">
      <Box marginTop={1}>
        <Text color={theme.text.secondary}>
          Endpoint: {ALIBABA_STANDARD_API_KEY_ENDPOINTS[alibabaStandardRegion]}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color={theme.text.secondary}>{t('Documentation')}:</Text>
      </Box>
      <Box marginTop={0}>
        <Link
          url={ALIBABA_STANDARD_API_DOCUMENTATION_URLS[alibabaStandardRegion]}
          fallback={false}
        >
          <Text color={theme.text.link}>
            {ALIBABA_STANDARD_API_DOCUMENTATION_URLS[alibabaStandardRegion]}
          </Text>
        </Link>
      </Box>
      <Box marginTop={1}>
        <TextInput
          value={alibabaStandardApiKey}
          onChange={(value) => {
            setAlibabaStandardApiKey(value);
            if (alibabaStandardApiKeyError) {
              setAlibabaStandardApiKeyError(null);
            }
          }}
          onSubmit={handleAlibabaStandardApiKeySubmit}
          placeholder="sk-..."
        />
      </Box>
      {alibabaStandardApiKeyError && (
        <Box marginTop={1}>
          <Text color={theme.status.error}>{alibabaStandardApiKeyError}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color={theme.text.secondary}>
          {t('Enter to submit, Esc to go back')}
        </Text>
      </Box>
    </Box>
  );

  const renderAlibabaStandardModelIdInputView = () => (
    <Box marginTop={1} flexDirection="column">
      <Box marginTop={1}>
        <Text color={theme.text.secondary}>
          {t(
            'You can enter multiple model IDs, separated by commas. Examples: aether3.5-plus,glm-5,kimi-k2.5',
          )}
        </Text>
      </Box>
      <Box marginTop={1}>
        <TextInput
          value={alibabaStandardModelId}
          onChange={(value) => {
            setAlibabaStandardModelId(value);
            if (alibabaStandardModelIdError) {
              setAlibabaStandardModelIdError(null);
            }
          }}
          onSubmit={handleAlibabaStandardModelSubmit}
          placeholder={ALIBABA_STANDARD_MODEL_IDS_PLACEHOLDER}
        />
      </Box>
      {alibabaStandardModelIdError && (
        <Box marginTop={1}>
          <Text color={theme.status.error}>{alibabaStandardModelIdError}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color={theme.text.secondary}>
          {t('Enter to submit, Esc to go back')}
        </Text>
      </Box>
    </Box>
  );

  // Render custom mode info
  const renderCustomInfoView = () => (
    <>
      <Box marginTop={1}>
        <Text color={theme.text.primary}>
          {t('You can configure your API key and models in settings.json')}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text>{t('Refer to the documentation for setup instructions')}</Text>
      </Box>
      <Box marginTop={0}>
        <Link url={MODEL_PROVIDERS_DOCUMENTATION_URL} fallback={false}>
          <Text color={theme.text.link}>
            {MODEL_PROVIDERS_DOCUMENTATION_URL}
          </Text>
        </Link>
      </Box>
      <Box marginTop={1}>
        <Text color={theme.text.secondary}>{t('Esc to go back')}</Text>
      </Box>
    </>
  );

  const getViewTitle = () => {
    switch (viewLevel) {
      case 'main':
        case 'api-key-type-select':
            return t('API Key');
      case 'region-select':
        return t('Select Region for Coding Plan');
      case 'api-key-input':
            return t('Enter Coding Plan API Key');
      case 'custom-info':
        return t('Custom Configuration');
      case 'alibaba-standard-region-select':
        return t(
          'Select Region for Alibaba Cloud ModelStudio Standard API Key',
        );
      case 'alibaba-standard-api-key-input':
        return t('Enter Alibaba Cloud ModelStudio Standard API Key');
      case 'alibaba-standard-model-id-input':
        return t('Enter Model IDs');
      default:
            return t('API Key');
    }
  };

  return (
    <Box
      borderStyle="single"
      borderColor={theme?.border?.default}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold>{getViewTitle()}</Text>

      {viewLevel === 'region-select' && renderRegionSelectView()}
      {viewLevel === 'api-key-input' && renderApiKeyInputView()}
      {viewLevel === 'api-key-type-select' && renderApiKeyTypeSelectView()}
      {viewLevel === 'alibaba-standard-region-select' &&
        renderAlibabaStandardRegionSelectView()}
      {viewLevel === 'alibaba-standard-api-key-input' &&
        renderAlibabaStandardApiKeyInputView()}
      {viewLevel === 'alibaba-standard-model-id-input' &&
        renderAlibabaStandardModelIdInputView()}
      {viewLevel === 'custom-info' && renderCustomInfoView()}

      {(authError || errorMessage) && (
        <Box marginTop={1}>
          <Text color={theme.status.error}>{authError || errorMessage}</Text>
        </Box>
          )}
    </Box>
  );
}
