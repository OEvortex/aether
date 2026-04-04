/*---------------------------------------------------------------------------------------------
 *  LLMGateway Provider
 *  Dynamically fetches models from LLMGateway API with free model detection
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
    CancellationToken,
    LanguageModelChatInformation,
    LanguageModelChatMessage,
    LanguageModelChatProvider,
    Progress,
    ProvideLanguageModelChatResponseOptions
} from 'vscode';
import * as vscode from 'vscode';
import { ApiKeyManager } from '../../utils/apiKeyManager';
import { Logger } from '../../utils/logger';
import { RateLimiter } from '../../utils/rateLimiter';
import { ProviderWizard } from '../../utils/providerWizard';
import {
    resolveGlobalCapabilities,
    resolveGlobalTokenLimits
} from '../../utils/globalContextLengthManager';
import { getProviderRateLimit } from '../../utils/knownProviders';
import { GenericModelProvider } from '../common/genericModelProvider';
import type { ProviderConfig } from '../../types/sharedTypes';

const LLG_GATEWAY_BASE_URL = 'https://api.llmgateway.io/v1';

interface LLGGatewayProviderInfo {
    providerId: string;
    modelName: string;
    streaming?: boolean;
    vision?: boolean;
    tools?: boolean;
    reasoning?: boolean;
}

interface LLGGatewayAPIModel {
    id: string;
    name?: string;
    aliases?: string[];
    created?: number;
    description?: string;
    family?: string;
    context_length?: number;
    free?: boolean;
    providers?: LLGGatewayProviderInfo[];
    architecture?: {
        input_modalities?: string[];
        output_modalities?: string[];
    };
}

interface LLGGatewayModelsResponse {
    data?: LLGGatewayAPIModel[];
}

function formatLLGModelName(model: LLGGatewayAPIModel): string {
    return model.name || model.id;
}

/**
 * LLMGateway Dedicated Model Provider Class
 * Dynamically fetches models from LLMGateway API
 */
export class LLGGatewayProvider
    extends GenericModelProvider
    implements LanguageModelChatProvider
{
    private readonly configFilePath: string;

    constructor(
        context: vscode.ExtensionContext,
        providerKey: string,
        providerConfig: ProviderConfig
    ) {
        super(context, providerKey, providerConfig);
        this.configFilePath = path.join(
            context.extensionPath,
            'dist',
            'providers',
            'config',
            'llmgateway.json'
        );
    }

    private getBaseUrl(): string {
        return LLG_GATEWAY_BASE_URL;
    }

    private async fetchModels(apiKey: string): Promise<LLGGatewayAPIModel[]> {
        const url = `${this.getBaseUrl()}/models`;
        Logger.info(`[LLMGateway] Fetching models from ${url}`);

        const resp = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${apiKey}`
            }
        });

        if (!resp.ok) {
            let text = '';
            try {
                text = await resp.text();
            } catch {
                // ignore
            }
            const err = new Error(
                `Failed to fetch LLMGateway models: ${resp.status} ${resp.statusText}${text ? `\n${text}` : ''}`
            );
            Logger.error('[LLMGateway] Failed to fetch models', err);
            throw err;
        }

        const parsed = (await resp.json()) as LLGGatewayModelsResponse;
        return parsed.data ?? [];
    }

    private getModelMetadata(model: LLGGatewayAPIModel): {
        name: string;
        maxInputTokens: number;
        maxOutputTokens: number;
        toolCalling: boolean;
        imageInput: boolean;
    } {
        const displayName = formatLLGModelName(model);
        const contextLength = model.context_length || 128 * 1024;
        const tokens = resolveGlobalTokenLimits(model.id, contextLength, {
            defaultContextLength: contextLength,
            defaultMaxOutputTokens: 32 * 1024
        });

        const hasTools = model.providers?.some((p) => p.tools) ?? false;
        const hasVision =
            model.providers?.some((p) => p.vision) ??
            model.architecture?.input_modalities?.includes('image') ??
            false;

        return {
            name: displayName,
            maxInputTokens: tokens.maxInputTokens,
            maxOutputTokens: tokens.maxOutputTokens,
            toolCalling: hasTools,
            imageInput: hasVision
        };
    }

    private async getApiKeyFromManager(): Promise<string | null> {
        try {
            const key = await ApiKeyManager.getApiKey(this.providerKey);
            return key === undefined ? null : key;
        } catch (err) {
            Logger.warn('[LLMGateway] Failed to get API key:', err);
            return null;
        }
    }

    override async provideLanguageModelChatInformation(
        options: { silent: boolean },
        token: CancellationToken
    ): Promise<LanguageModelChatInformation[]> {
        const apiKey = await this.getApiKeyFromManager();
        if (!apiKey) {
            return super.provideLanguageModelChatInformation(options, token);
        }

        try {
            const models = await this.fetchModels(apiKey);
            if (models.length > 0) {
                this.updateLLGConfigFile(models);
            }

            const infos = models.map((model) => {
                const modelMeta = this.getModelMetadata(model);
                return {
                    id: model.id,
                    name: modelMeta.name,
                    tooltip: model.description || `${model.id} via LLMGateway`,
                    family: model.family || 'LLMGateway',
                    version: '1.0.0',
                    maxInputTokens: modelMeta.maxInputTokens,
                    maxOutputTokens: modelMeta.maxOutputTokens,
                    capabilities: {
                        toolCalling: modelMeta.toolCalling,
                        imageInput: modelMeta.imageInput
                    }
                } as LanguageModelChatInformation;
            });

            this._chatEndpoints = infos.map((info) => ({
                model: info.id,
                modelMaxPromptTokens: info.maxInputTokens + info.maxOutputTokens
            }));

            return infos;
        } catch (err) {
            Logger.warn(
                '[LLMGateway] Failed to fetch models from API, falling back to config:',
                err instanceof Error ? err.message : String(err)
            );
            return super.provideLanguageModelChatInformation(options, token);
        }
    }

    private updateLLGConfigFile(models: LLGGatewayAPIModel[]): void {
        (async () => {
            try {
                if (!fs.existsSync(this.configFilePath)) {
                    Logger.debug(
                        `[LLMGateway] Config file not found at ${this.configFilePath}, skipping auto-update`
                    );
                    return;
                }

                const modelConfigs = models.map((model) => {
                    const meta = this.getModelMetadata(model);
                    return {
                        id: model.id,
                        name: meta.name,
                        tooltip: model.description || `${model.id} via LLMGateway`,
                        maxInputTokens: meta.maxInputTokens,
                        maxOutputTokens: meta.maxOutputTokens,
                        model: model.id,
                        sdkMode: 'openai' as const,
                        baseUrl: this.getBaseUrl(),
                        capabilities: {
                            toolCalling: meta.toolCalling,
                            imageInput: meta.imageInput
                        }
                    };
                });

                let existingConfig: Record<string, unknown>;
                try {
                    const configContent = fs.readFileSync(
                        this.configFilePath,
                        'utf8'
                    );
                    existingConfig = JSON.parse(configContent) as Record<string, unknown>;
                } catch {
                    existingConfig = {
                        displayName: 'LLMGateway',
                        baseUrl: this.getBaseUrl(),
                        apiKeyTemplate: 'sk-xxxxxxxxxxxxxxxxxxxxxxxx',
                        models: []
                    };
                }

                const updatedConfig = {
                    displayName:
                        (existingConfig.displayName as string) || 'LLMGateway',
                    baseUrl:
                        (existingConfig.baseUrl as string) || this.getBaseUrl(),
                    apiKeyTemplate:
                        (existingConfig.apiKeyTemplate as string) ||
                        'sk-xxxxxxxxxxxxxxxxxxxxxxxx',
                    models: modelConfigs
                };

                fs.writeFileSync(
                    this.configFilePath,
                    JSON.stringify(updatedConfig, null, 4),
                    'utf8'
                );
                Logger.info(
                    `[LLMGateway] Auto-updated config file with ${modelConfigs.length} models`
                );
            } catch (err) {
                Logger.warn(
                    `[LLMGateway] Background config update failed: ${err instanceof Error ? err.message : String(err)}`
                );
            }
        })();
    }

    static createAndActivate(
        context: vscode.ExtensionContext,
        providerKey: string,
        providerConfig: ProviderConfig
    ): { provider: LLGGatewayProvider; disposables: vscode.Disposable[] } {
        Logger.trace(
            `${providerConfig.displayName} dedicated model extension activated!`
        );
        const provider = new LLGGatewayProvider(
            context,
            providerKey,
            providerConfig
        );
        const providerDisposable = vscode.lm.registerLanguageModelChatProvider(
            `chp.${providerKey}`,
            provider
        );

        const setApiKeyCommand = vscode.commands.registerCommand(
            `chp.${providerKey}.setApiKey`,
            async () => {
                await ProviderWizard.startWizard({
                    providerKey,
                    displayName: providerConfig.displayName,
                    apiKeyTemplate: providerConfig.apiKeyTemplate,
                    supportsApiKey: true
                });
                await provider.modelInfoCache?.invalidateCache(providerKey);
                provider._onDidChangeLanguageModelChatInformation.fire();
            }
        );

        const disposables = [providerDisposable, setApiKeyCommand];
        for (const disposable of disposables) {
            context.subscriptions.push(disposable);
        }
        return { provider, disposables };
    }

    override async provideLanguageModelChatResponse(
        model: LanguageModelChatInformation,
        messages: Array<LanguageModelChatMessage>,
        options: ProvideLanguageModelChatResponseOptions,
        progress: Progress<vscode.LanguageModelResponsePart>,
        token: CancellationToken
    ): Promise<void> {
        const rateLimit = getProviderRateLimit(this.providerKey, 'openai');
        const requestsPerSecond = rateLimit?.requestsPerSecond ?? 1;
        const windowMs = rateLimit?.windowMs ?? 1000;

        const rateLimiter = RateLimiter.getInstance(
            `${this.providerKey}:openai:${requestsPerSecond}:${windowMs}`,
            requestsPerSecond,
            windowMs
        );

        await rateLimiter.executeWithRetry(
            async () => {
                await this.executeLLGRequest(
                    model,
                    messages,
                    options,
                    progress,
                    token
                );
            },
            this.providerConfig.displayName
        );
    }

    private async executeLLGRequest(
        model: LanguageModelChatInformation,
        messages: Array<LanguageModelChatMessage>,
        options: ProvideLanguageModelChatResponseOptions,
        progress: Progress<vscode.LanguageModelResponsePart>,
        token: CancellationToken
    ): Promise<void> {
        const modelConfig = this.providerConfig.models.find(
            (m) => m.id === model.id
        );
        if (modelConfig) {
            modelConfig.sdkMode = 'openai';
            modelConfig.baseUrl = this.getBaseUrl();

            // Inject free_models_only for the hardcoded "Free" model
            if (model.id === 'free') {
                modelConfig.extraBody = {
                    ...(modelConfig.extraBody || {}),
                    free_models_only: true
                };
            }
        }

        await super.provideLanguageModelChatResponse(
            model,
            messages,
            options,
            progress,
            token
        );
    }
}
