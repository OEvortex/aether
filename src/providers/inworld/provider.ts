/*---------------------------------------------------------------------------------------------
 *  Inworld Router Provider
 *  Custom provider with HTML-based model fetching from inworld.ai/models
 *--------------------------------------------------------------------------------------------*/

import * as crypto from 'node:crypto';
import type {
    CancellationToken,
    LanguageModelChatInformation,
    LanguageModelChatMessage,
    LanguageModelChatProvider,
    Progress,
    ProvideLanguageModelChatResponseOptions
} from 'vscode';
import * as vscode from 'vscode';
import { AccountManager } from '../../accounts/accountManager';
import type {
    AccountCredentials,
    ApiKeyCredentials
} from '../../accounts/types';
import type { ModelConfig, ProviderConfig } from '../../types/sharedTypes';
import { ApiKeyManager, Logger, RateLimiter } from '../../utils';
import {
    DEFAULT_CONTEXT_LENGTH,
    DEFAULT_MAX_OUTPUT_TOKENS,
    resolveGlobalCapabilities,
    resolveGlobalTokenLimits
} from '../../utils/globalContextLengthManager';
import { getProviderRateLimit } from '../../utils/knownProviders';
import { ProviderWizard } from '../../utils/providerWizard';
import { GenericModelProvider } from '../common/genericModelProvider';
import { InworldHandler } from './handler';

function hashValue(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
}

export class InworldProvider
    extends GenericModelProvider
    implements LanguageModelChatProvider
{
    private readonly accountManager = AccountManager.getInstance();
    private readonly handler = new InworldHandler();
    cachedModelConfigs: ModelConfig[] = [];
    private cachedSignature = '';
    private cachedAt = 0;

    constructor(
        _context: vscode.ExtensionContext,
        private readonly providerKey: string,
        readonly cachedProviderConfig: ProviderConfig
    ) {
        super(_context, providerKey, cachedProviderConfig);
    }

    private modelConfigToInfo(
        model: ModelConfig
    ): LanguageModelChatInformation {
        const contextLength = model.maxInputTokens + model.maxOutputTokens;
        const { maxInputTokens, maxOutputTokens } = resolveGlobalTokenLimits(
            model.id,
            contextLength,
            {
                defaultContextLength: contextLength || DEFAULT_CONTEXT_LENGTH,
                defaultMaxOutputTokens:
                    model.maxOutputTokens || DEFAULT_MAX_OUTPUT_TOKENS
            }
        );

        const capabilities = resolveGlobalCapabilities(model.id, {
            detectedToolCalling: model.capabilities?.toolCalling,
            detectedImageInput: model.capabilities?.imageInput
        });

        return {
            id: model.id,
            name: model.name,
            detail: this.providerConfig.displayName,
            tooltip:
                model.tooltip ||
                `${model.name} via ${this.providerConfig.displayName}`,
            family:
                model.family || this.providerConfig.family || this.providerKey,
            maxInputTokens,
            maxOutputTokens,
            version: model.model || model.id,
            capabilities
        };
    }

    private async resolveCredentials(): Promise<{
        apiKey?: string;
        baseUrl: string;
        customHeaders?: Record<string, string>;
        accountId?: string;
    }> {
        const activeAccount = this.accountManager.getActiveAccount(
            this.providerKey
        );

        if (activeAccount) {
            const credentials = (await this.accountManager.getCredentials(
                activeAccount.id
            )) as AccountCredentials | undefined;

            if (credentials && 'apiKey' in credentials) {
                const apiKeyCredentials = credentials as ApiKeyCredentials;
                return {
                    apiKey: apiKeyCredentials.apiKey,
                    baseUrl:
                        apiKeyCredentials.endpoint ||
                        this.providerConfig.baseUrl,
                    customHeaders: apiKeyCredentials.customHeaders,
                    accountId: activeAccount.id
                };
            }
        }

        const apiKey = await ApiKeyManager.getApiKey(this.providerKey);
        return {
            apiKey,
            baseUrl: this.providerConfig.baseUrl
        };
    }

    override async provideLanguageModelChatInformation(
        _options: { silent: boolean },
        _token: CancellationToken
    ): Promise<LanguageModelChatInformation[]> {
        const credentials = await this.resolveCredentials();

        if (!this.providerConfig.fetchModels) {
            const staticModels = [...(this.providerConfig.models || [])];
            this.cachedModelConfigs = staticModels;
            return staticModels.map((m) => this.modelConfigToInfo(m));
        }

        const cooldownMinutes =
            this.providerConfig.modelParser?.cooldownMinutes ?? 30;
        const cooldownMs = cooldownMinutes * 60 * 1000;
        const signature = hashValue(`${cooldownMinutes}`);

        if (
            this.cachedSignature === signature &&
            this.cachedModelConfigs.length > 0 &&
            Date.now() - this.cachedAt < cooldownMs
        ) {
            return this.cachedModelConfigs.map((m) =>
                this.modelConfigToInfo(m)
            );
        }

        try {
            const fetched = await this.handler.fetchModels(
                credentials.apiKey || '',
                credentials.baseUrl,
                this.providerConfig,
                credentials.customHeaders
            );

            this.cachedModelConfigs = fetched;
            this.cachedSignature = signature;
            this.cachedAt = Date.now();

            return fetched.map((m) => this.modelConfigToInfo(m));
        } catch (error) {
            Logger.warn(
                `[Inworld] Failed to fetch remote models: ${error instanceof Error ? error.message : String(error)}`
            );
            const staticModels = [...(this.providerConfig.models || [])];
            this.cachedModelConfigs = staticModels;
            return staticModels.map((m) => this.modelConfigToInfo(m));
        }
    }

    override async provideLanguageModelChatResponse(
        model: LanguageModelChatInformation,
        messages: Array<LanguageModelChatMessage>,
        options: ProvideLanguageModelChatResponseOptions,
        progress: Progress<vscode.LanguageModelResponsePart2>,
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

        await rateLimiter.executeWithRetry(async () => {
            await this.executeRequest(
                model,
                messages,
                options,
                progress,
                token
            );
        }, this.providerConfig.displayName);
    }

    private async executeRequest(
        model: LanguageModelChatInformation,
        messages: Array<LanguageModelChatMessage>,
        options: ProvideLanguageModelChatResponseOptions,
        progress: Progress<vscode.LanguageModelResponsePart2>,
        token: CancellationToken
    ): Promise<void> {
        const modelConfig =
            this.cachedModelConfigs.find((m) => m.id === model.id) ||
            this.providerConfig.models?.find((m) => m.id === model.id);

        await this.openaiHandler.handleRequest(
            model,
            modelConfig || {
                id: model.id,
                name: model.name,
                tooltip: model.tooltip || model.name,
                maxInputTokens: model.maxInputTokens,
                maxOutputTokens: model.maxOutputTokens,
                model: model.version || model.id,
                baseUrl: this.providerConfig.baseUrl,
                capabilities: model.capabilities
            },
            messages,
            options,
            progress,
            token
        );
    }

    static createAndActivate(
        context: vscode.ExtensionContext,
        providerKey: string,
        providerConfig: ProviderConfig
    ): { provider: InworldProvider; disposables: vscode.Disposable[] } {
        Logger.trace(`${providerConfig.displayName} provider activated!`);

        const provider = new InworldProvider(
            context,
            providerKey,
            providerConfig
        );

        const providerDisposable = vscode.lm.registerLanguageModelChatProvider(
            `aether.${providerKey}`,
            provider
        );

        const setApiKeyCommand = vscode.commands.registerCommand(
            `aether.${providerKey}.setApiKey`,
            async () => {
                await ProviderWizard.startWizard({
                    providerKey,
                    displayName: providerConfig.displayName,
                    apiKeyTemplate: providerConfig.apiKeyTemplate,
                    supportsApiKey: true
                });
            }
        );

        const refreshModelsCommand = vscode.commands.registerCommand(
            `aether.${providerKey}.refreshModels`,
            async () => {
                provider._onDidChangeLanguageModelChatInformation.fire(
                    undefined
                );
            }
        );

        const configWizardCommand = vscode.commands.registerCommand(
            `aether.${providerKey}.configWizard`,
            async () => {
                await ProviderWizard.startWizard({
                    providerKey,
                    displayName: providerConfig.displayName,
                    apiKeyTemplate: providerConfig.apiKeyTemplate,
                    supportsApiKey: true
                });
            }
        );

        const disposables = [
            providerDisposable,
            setApiKeyCommand,
            refreshModelsCommand,
            configWizardCommand
        ];

        for (const disposable of disposables) {
            context.subscriptions.push(disposable);
        }

        return { provider, disposables };
    }
}
