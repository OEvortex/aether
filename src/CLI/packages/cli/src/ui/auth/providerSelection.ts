/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AuthType,
  type ProviderModelConfig,
  type ModelProvidersConfig,
} from '@aether/aether-core';
import { KnownProviders } from '../../../../../../utils/knownProvidersData.js';

export function getProviderAuthType(providerId: string): AuthType {
  const provider = KnownProviders[providerId];
  if (provider?.sdkMode === 'anthropic') {
    return AuthType.USE_ANTHROPIC;
  }
  if (provider?.sdkMode === 'oai-response') {
    return AuthType.USE_OPENAI;
  }
  return AuthType.USE_OPENAI;
}

export function getProviderBaseUrl(providerId: string): string | undefined {
  const provider = KnownProviders[providerId];
  return (
    provider?.baseUrl ||
    provider?.openai?.baseUrl ||
    provider?.anthropic?.baseUrl ||
    provider?.responses?.baseUrl
  );
}

function getProviderCustomHeader(providerId: string): Record<string, string> | undefined {
  const provider = KnownProviders[providerId];
  return (
    provider?.customHeader ||
    provider?.openai?.customHeader ||
    provider?.anthropic?.customHeader ||
    provider?.responses?.customHeader
  );
}

function getProviderExtraBody(providerId: string): Record<string, unknown> | undefined {
  const provider = KnownProviders[providerId];
  return (
    provider?.extraBody ||
    provider?.openai?.extraBody ||
    provider?.anthropic?.extraBody ||
    provider?.responses?.extraBody
  );
}

function mapInlineModels(providerId: string): ProviderModelConfig[] {
  const provider = KnownProviders[providerId];
  if (!provider?.models?.length) {
    return [];
  }

  const baseUrl = getProviderBaseUrl(providerId);
  const customHeader = getProviderCustomHeader(providerId);
  const extraBody = getProviderExtraBody(providerId);

  return provider.models.map((model) => ({
    id: model.id,
    name: model.name || model.id,
    description: model.tooltip,
    provider: providerId,
    model: model.model || model.id,
    sdkMode: model.sdkMode || provider.sdkMode,
    baseUrl: model.baseUrl || baseUrl,
    apiKey: model.apiKey,
    customHeader: model.customHeader || customHeader,
    extraBody: model.extraBody || extraBody,
    fetchModels: false,
  }));
}

function buildDiscoveryTemplate(providerId: string): ProviderModelConfig | undefined {
  const provider = KnownProviders[providerId];
  if (!provider) {
    return undefined;
  }

  const baseUrl = getProviderBaseUrl(providerId);
  if (!baseUrl && !provider.fetchModels) {
    return undefined;
  }

  return {
    id: providerId,
    name: provider.displayName,
    description: provider.description,
    provider: providerId,
    sdkMode: provider.sdkMode,
    baseUrl,
    customHeader: getProviderCustomHeader(providerId),
    extraBody: getProviderExtraBody(providerId),
    fetchModels: provider.fetchModels,
    modelsEndpoint: provider.modelsEndpoint,
    modelParser: provider.modelParser,
  };
}

export function buildProviderModelProvidersConfig(
  providerId: string,
): ModelProvidersConfig | undefined {
  const authType = getProviderAuthType(providerId);
  const inlineModels = mapInlineModels(providerId);
  const providerTemplate = buildDiscoveryTemplate(providerId);
  const models = inlineModels.length > 0 ? inlineModels : providerTemplate ? [providerTemplate] : [];

  if (models.length === 0) {
    return undefined;
  }

  return {
    [authType]: models,
  };
}

