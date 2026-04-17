/**
 * Model Selector - OpenCode-style provider::model selection
 * Manages current model/provider selection with provider::model format
 */

import * as vscode from 'vscode';
import { ApiKeyManager } from './apiKeyManager';
import { KnownProviders } from './knownProviders';
import { Logger } from './logger';
import { ModelInfoCache } from './modelInfoCache';

const MODEL_SEPARATOR = '::';

/**
 * Extended QuickPickItem that carries model info
 */
interface ModelPickItem extends vscode.QuickPickItem {
    modelInfo?: ModelInfo;
}

/**
 * Parsed model identifier in provider::model format
 */
export interface ParsedModelId {
    providerId: string;
    modelId: string;
    /** Full identifier: provider::model */
    fullId: string;
    /** Display name: ProviderName / ModelId */
    displayName: string;
}

/**
 * Model info with provider context
 */
export interface ModelInfo {
    id: string;
    providerId: string;
    providerName: string;
    name: string;
    maxInputTokens?: number;
    maxOutputTokens?: number;
    capabilities?: {
        toolCalling?: boolean;
        imageInput?: boolean;
    };
}

let _modelInfoCache: ModelInfoCache | undefined;
const _onDidChangeModel = new vscode.EventEmitter<{
    providerId: string;
    modelId: string;
    fullId: string;
}>();

/**
 * Initialize ModelSelector with a real extension context.
 */
export function initialize(context: vscode.ExtensionContext): void {
    _modelInfoCache = new ModelInfoCache(context);
}

function getModelInfoCache(): ModelInfoCache {
    if (!_modelInfoCache) {
        throw new Error(
            '[ModelSelector] Not initialized. Call ModelSelector.initialize(context) from activate().'
        );
    }
    return _modelInfoCache;
}

/**
 * Parse provider::model string into components
 */
export function parseModelId(modelString: string): ParsedModelId | null {
    if (!modelString) {
        return null;
    }

    const separatorIndex = modelString.indexOf(MODEL_SEPARATOR);
    if (separatorIndex === -1) {
        // Try to find in known providers
        if (KnownProviders[modelString]) {
            return {
                providerId: modelString,
                modelId: '',
                fullId: `${modelString}${MODEL_SEPARATOR}`,
                displayName: KnownProviders[modelString].displayName
            };
        }
        return null;
    }

    const providerId = modelString.substring(0, separatorIndex);
    const modelId = modelString.substring(
        separatorIndex + MODEL_SEPARATOR.length
    );
    const providerName = KnownProviders[providerId]?.displayName || providerId;

    return {
        providerId,
        modelId,
        fullId: modelString,
        displayName: `${providerName} / ${modelId}`
    };
}

/**
 * Create provider::model string from components
 */
export function formatModelId(providerId: string, modelId: string): string {
    return `${providerId}${MODEL_SEPARATOR}${modelId}`;
}

/**
 * Get current selected model in provider::model format
 */
export async function getCurrentModel(): Promise<ParsedModelId | null> {
    const config = vscode.workspace.getConfiguration('aether');
    const modelString = config.get<string>('selectedModel');

    if (modelString) {
        const parsed = parseModelId(modelString);
        if (parsed) {
            return parsed;
        }
    }

    // Fallback: try to get from last used model
    return getLastUsedModel();
}

/**
 * Set current selected model
 */
export async function setCurrentModel(
    providerId: string,
    modelId: string
): Promise<void> {
    const modelString = formatModelId(providerId, modelId);
    const config = vscode.workspace.getConfiguration('aether');
    await config.update(
        'selectedModel',
        modelString,
        vscode.ConfigurationTarget.Global
    );

    // Also save to model info cache for quick access
    await getModelInfoCache().setLastSelectedModelForProvider(
        providerId,
        modelId
    );

    Logger.info(`[ModelSelector] Selected model: ${modelString}`);

    // Notify listeners of model change
    _onDidChangeModel.fire({
        providerId,
        modelId,
        fullId: modelString
    });
}

/**
 * Get all available models from all providers (merged)
 */
export async function getAllModels(): Promise<ModelInfo[]> {
    const models: ModelInfo[] = [];

    // Get models from all registered providers
    for (const [providerId, providerConfig] of Object.entries(KnownProviders)) {
        try {
            // Skip providers that don't support model fetching
            if (
                !providerConfig.fetchModels &&
                (!providerConfig.models || providerConfig.models.length === 0)
            ) {
                continue;
            }

            // Try to get models from config or cache
            const providerModels = await getProviderModels(providerId);
            for (const model of providerModels) {
                models.push({
                    id: model.id,
                    providerId,
                    providerName: providerConfig.displayName || providerId,
                    name: model.name || model.id,
                    maxInputTokens: model.maxInputTokens,
                    maxOutputTokens: model.maxOutputTokens,
                    capabilities: model.capabilities
                });
            }
        } catch (err) {
            Logger.warn(
                `[ModelSelector] Failed to get models for ${providerId}:`,
                err
            );
        }
    }

    return models.sort((a, b) => {
        // Sort by provider name, then model name
        const providerCompare = a.providerName.localeCompare(b.providerName);
        if (providerCompare !== 0) {
            return providerCompare;
        }
        return a.name.localeCompare(b.name);
    });
}

/**
 * Get models for a specific provider
 */
export async function getProviderModels(
    providerId: string
): Promise<ModelInfo[]> {
    const providerConfig = KnownProviders[providerId];
    if (!providerConfig) {
        return [];
    }

    // Try to get from cached model info (compute API key hash for cache validation)
    try {
        const apiKey = await ApiKeyManager.getApiKey(providerId);
        const apiKeyHash = apiKey
            ? await ModelInfoCache.computeApiKeyHash(apiKey)
            : '';
        const cachedModels = await getModelInfoCache().getCachedModels(
            providerId,
            apiKeyHash
        );
        if (cachedModels && cachedModels.length > 0) {
            return cachedModels.map((m) => ({
                id: m.id,
                providerId,
                providerName: providerConfig.displayName || providerId,
                name: m.name || m.id,
                maxInputTokens: m.maxInputTokens,
                maxOutputTokens: m.maxOutputTokens,
                capabilities: m.capabilities
            }));
        }
    } catch (err) {
        Logger.warn(
            `[ModelSelector] Cache lookup failed for ${providerId}:`,
            err
        );
    }

    // Fallback to configured models
    if (providerConfig.models) {
        return providerConfig.models.map((m) => ({
            id: m.id,
            providerId,
            providerName: providerConfig.displayName || providerId,
            name: m.name || m.id,
            maxInputTokens: m.maxInputTokens,
            maxOutputTokens: m.maxOutputTokens,
            capabilities: m.capabilities
        }));
    }

    return [];
}

/**
 * Get last used model (fallback)
 */
export async function getLastUsedModel(): Promise<ParsedModelId | null> {
    // Try to get from model info cache
    for (const providerId of Object.keys(KnownProviders)) {
        const lastModel = getModelInfoCache().getLastSelectedModel(providerId);
        if (lastModel) {
            return {
                providerId,
                modelId: lastModel,
                fullId: formatModelId(providerId, lastModel),
                displayName: `${KnownProviders[providerId]?.displayName || providerId} / ${lastModel}`
            };
        }
    }
    return null;
}

/**
 * Show quick pick to select model
 */
export async function showModelPicker(): Promise<ParsedModelId | undefined> {
    const allModels = await getAllModels();

    if (allModels.length === 0) {
        vscode.window.showInformationMessage(
            'No models available. Please configure API keys for providers first.'
        );
        return undefined;
    }

    // Group by provider
    const providerGroups = new Map<string, ModelInfo[]>();
    for (const model of allModels) {
        const existing = providerGroups.get(model.providerId) || [];
        existing.push(model);
        providerGroups.set(model.providerId, existing);
    }

    const items: ModelPickItem[] = [];
    for (const [providerId, models] of providerGroups) {
        // Add provider separator
        items.push({
            label: `$(cloud) ${KnownProviders[providerId]?.displayName || providerId}`,
            kind: vscode.QuickPickItemKind.Separator
        });

        // Add models
        for (const model of models) {
            const detail = `${model.maxInputTokens ? `${(model.maxInputTokens / 1000).toFixed(0)}K` : '?'} context`;
            items.push({
                label: model.name,
                description: model.id,
                detail,
                modelInfo: model
            });
        }
    }

    const selected = await vscode.window.showQuickPick(items, {
        title: 'Select Model',
        placeHolder: 'Search and select a model...',
        matchOnDescription: true,
        matchOnDetail: true
    });

    if (selected?.modelInfo) {
        const modelInfo = selected.modelInfo;
        const fullId = formatModelId(modelInfo.providerId, modelInfo.id);
        await setCurrentModel(modelInfo.providerId, modelInfo.id);
        return parseModelId(fullId) ?? undefined;
    }
    return undefined;
}

/**
 * Show quick pick to select provider only
 */
export async function showProviderPicker(): Promise<string | undefined> {
    const providers = Object.entries(KnownProviders)
        .filter(
            ([_, config]) =>
                config.fetchModels ||
                (config.models && config.models.length > 0)
        )
        .map(([id, config]) => ({
            label: `$(cloud) ${config.displayName || id}`,
            description: id,
            detail: config.fetchModels ? 'Dynamic models' : 'Static models'
        }));

    const selected = await vscode.window.showQuickPick(providers, {
        title: 'Select Provider',
        placeHolder: 'Choose a provider...'
    });

    return selected?.description;
}

/**
 * Dispose resources
 */
export function dispose(): void {
    _onDidChangeModel.dispose();
}

/**
 * Model Selector (deprecated class-like interface for backward compatibility)
 */
export const ModelSelector = {
    initialize,
    parseModelId,
    formatModelId,
    getCurrentModel,
    setCurrentModel,
    getAllModels,
    getProviderModels,
    getLastUsedModel,
    showModelPicker,
    showProviderPicker,
    onDidChangeModel: _onDidChangeModel.event,
    dispose
};
