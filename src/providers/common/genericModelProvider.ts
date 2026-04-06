/*---------------------------------------------------------------------------------------------
 *  Generic Provider Class
 *  Dynamically create provider implementation based on configuration file
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type {
    CancellationToken,
    LanguageModelChatInformation,
    LanguageModelChatMessage,
    LanguageModelChatMessage2,
    LanguageModelChatProvider,
    Progress,
    ProvideLanguageModelChatResponseOptions
} from 'vscode';
import * as vscode from 'vscode';
import { AccountManager } from '../../accounts';
import type { Account } from '../../accounts/types';
import type { ModelConfig, ProviderConfig } from '../../types/sharedTypes';
import {
    AnthropicHandler,
    ApiKeyManager,
    ConfigManager,
    Logger,
    ModelInfoCache,
    OpenAIHandler,
    ResponsesHandler,
    RetryManager,
    TokenCounter
} from '../../utils';
import {
    DEFAULT_CONTEXT_LENGTH,
    DEFAULT_MAX_OUTPUT_TOKENS,
    resolveAdvertisedTokenLimits,
    resolveGlobalCapabilities,
    resolveGlobalTokenLimits
} from '../../utils/globalContextLengthManager';
import { KnownProviders } from '../../utils/knownProviders';
import { ProviderWizard } from '../../utils/providerWizard';
import { getUserAgent } from '../../utils/userAgent';
import { MoonshotWizard } from '../moonshot/moonshotWizard';

function getPositiveNumber(value: unknown): number | undefined {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue > 0
        ? numericValue
        : undefined;
}

/**
 * Generic Model Provider Class
 * Dynamically create provider implementation based on configuration file
 */
export class GenericModelProvider implements LanguageModelChatProvider {
    protected openaiHandler!: OpenAIHandler;
    protected anthropicHandler!: AnthropicHandler;
    protected responsesHandler!: ResponsesHandler;
    protected readonly providerKey: string;
    protected readonly context: vscode.ExtensionContext;
    protected baseProviderConfig: ProviderConfig; // protected to support subclass access
    protected cachedProviderConfig: ProviderConfig; // Cached configuration
    protected configListener?: vscode.Disposable; // Configuration listener
    protected modelInfoCache?: ModelInfoCache; // Model information cache
    protected readonly accountManager: AccountManager;
    protected readonly lastUsedAccountByModel = new Map<string, string>();

    // Cached chat endpoints for chat endpoint-aware providers (model id and max prompt tokens)
    protected _chatEndpoints?: {
        model: string;
        modelMaxPromptTokens: number;
    }[];

    // Model information change event
    protected _onDidChangeLanguageModelChatInformation =
        new vscode.EventEmitter<void>();
    readonly onDidChangeLanguageModelChatInformation =
        this._onDidChangeLanguageModelChatInformation.event;

    constructor(
        context: vscode.ExtensionContext,
        providerKey: string,
        providerConfig: ProviderConfig
    ) {
        this.context = context;
        this.providerKey = providerKey;
        this.accountManager = AccountManager.getInstance();
        // Save original configuration (overrides not applied)
        this.baseProviderConfig = providerConfig;
        // Initialize cached configuration (overrides applied)
        this.cachedProviderConfig = ConfigManager.applyProviderOverrides(
            this.providerKey,
            this.baseProviderConfig
        );
        // Initialize model information cache
        this.modelInfoCache = new ModelInfoCache(context);

        // Listen for configuration changes
        this.configListener = vscode.workspace.onDidChangeConfiguration((e) => {
            // Check if it is a change in provider overrides or provider runtime settings
            if (
                providerKey !== 'compatible' &&
                (e.affectsConfiguration('aether.providerOverrides') ||
                    e.affectsConfiguration(`aether.${providerKey}.sdkMode`))
            ) {
                // Recalculate configuration
                this.cachedProviderConfig =
                    ConfigManager.applyProviderOverrides(
                        this.providerKey,
                        this.baseProviderConfig
                    );
                this.refreshHandlers();
                // Clear cache
                this.modelInfoCache
                    ?.invalidateCache(this.providerKey)
                    .catch((err) =>
                        Logger.warn(
                            `[${this.providerKey}] Failed to clear cache:`,
                            err
                        )
                    );
                Logger.trace(`${this.providerKey} configuration updated`);
                this._onDidChangeLanguageModelChatInformation.fire();
            }
        });
        // Listen for chat endpoint changes
        this.accountManager.onAccountChange((e) => {
            if (e.provider === this.providerKey || e.provider === 'all') {
                Logger.trace(
                    `[${this.providerKey}] Account change detected: ${e.type}`
                );
                // Invalidate cache
                this.modelInfoCache
                    ?.invalidateCache(this.providerKey)
                    .catch((err) =>
                        Logger.warn(
                            `[${this.providerKey}] Failed to clear cache:`,
                            err
                        )
                    );
                // Trigger model info change event to sync with VS Code LM selection
                this._onDidChangeLanguageModelChatInformation.fire();
            }
        });

        // Create SDK handlers (use overrides)
        this.refreshHandlers();
    }

    /**
     * Refresh SDK handlers to apply runtime configuration updates
     * Subclasses can override to add additional cleanup
     */
    protected refreshHandlers(): void {
        this.openaiHandler?.dispose();
        this.openaiHandler = new OpenAIHandler(
            this.providerKey,
            this.baseProviderConfig.displayName,
            this.cachedProviderConfig.baseUrl
        );
        this.anthropicHandler = new AnthropicHandler(
            this.providerKey,
            this.baseProviderConfig.displayName,
            this.cachedProviderConfig.baseUrl
        );
        this.responsesHandler = new ResponsesHandler(
            this.providerKey,
            this.baseProviderConfig.displayName,
            this.cachedProviderConfig.baseUrl
        );
    }

    /**
     * Deduplicate model info by id
     */
    protected dedupeModelInfos(
        models: LanguageModelChatInformation[]
    ): LanguageModelChatInformation[] {
        const seen = new Set<string>();
        const deduped: LanguageModelChatInformation[] = [];
        for (const model of models) {
            if (seen.has(model.id)) {
                Logger.warn(
                    `[${this.providerKey}] Duplicate model id detected, skipping: ${model.id}`
                );
                continue;
            }
            seen.add(model.id);
            deduped.push(model);
        }
        return deduped;
    }

    /**
     * Release resources
     */
    dispose(): void {
        // Release configuration listener
        this.configListener?.dispose();
        // Release event emitter
        this._onDidChangeLanguageModelChatInformation.dispose();
        // Release handler resources
        // this.anthropicHandler?.dispose();
        this.openaiHandler?.dispose();
        this.responsesHandler?.dispose();
        Logger.info(`${this.providerConfig.displayName}: Extension destroyed`);
    }

    /**
     * Get current effective provider configuration
     */
    get providerConfig(): ProviderConfig {
        return this.cachedProviderConfig;
    }

    /**
     * Static factory method - Create and activate provider based on configuration
     */
    static createAndActivate(
        context: vscode.ExtensionContext,
        providerKey: string,
        providerConfig: ProviderConfig
    ): { provider: GenericModelProvider; disposables: vscode.Disposable[] } {
        Logger.trace(
            `${providerConfig.displayName} model extension activated!`
        );
        // Create provider instance
        const provider = new GenericModelProvider(
            context,
            providerKey,
            providerConfig
        );
        // Register language model chat provider
        const providerDisposable = vscode.lm.registerLanguageModelChatProvider(
            `aether.${providerKey}`,
            provider
        );
        // Register command to configure provider
        const setApiKeyCommand = vscode.commands.registerCommand(
            `aether.${providerKey}.setApiKey`,
            async () => {
                if (providerKey === 'moonshot') {
                    await MoonshotWizard.startWizard(
                        providerConfig.displayName,
                        providerConfig.apiKeyTemplate
                    );
                } else {
                    await ProviderWizard.startWizard({
                        providerKey,
                        displayName: providerConfig.displayName,
                        apiKeyTemplate: providerConfig.apiKeyTemplate,
                        supportsApiKey: true
                    });
                }
                // Clear cache after configuration change
                await provider.modelInfoCache?.invalidateCache(providerKey);
                // Trigger model information change event
                provider._onDidChangeLanguageModelChatInformation.fire();
            }
        );
        const disposables = [providerDisposable, setApiKeyCommand];
        for (const disposable of disposables) {
            context.subscriptions.push(disposable);
        }
        return { provider, disposables };
    }

    /**
     * Convert ModelConfig to LanguageModelChatInformation
     */
    protected modelConfigToInfo(
        model: ModelConfig
    ): LanguageModelChatInformation {
        const contextLength = model.maxInputTokens + model.maxOutputTokens;
        const { maxInputTokens, maxOutputTokens } = resolveGlobalTokenLimits(
            model.id,
            contextLength,
            {
                defaultContextLength: contextLength,
                defaultMaxOutputTokens: model.maxOutputTokens
            }
        );
        const capabilities = resolveGlobalCapabilities(model.id, {
            detectedToolCalling: model.capabilities?.toolCalling,
            detectedImageInput: model.capabilities?.imageInput
        });

        const info: LanguageModelChatInformation = {
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
            version: model.id,
            capabilities
        };

        return info;
    }

    /**
     * Fetch models dynamically from the provider's API endpoint
     * Returns the fetched models or empty array if the request fails
     */
    protected async fetchModelsFromApi(
        apiKey: string
    ): Promise<LanguageModelChatInformation[]> {
        try {
            const baseUrl = this.providerConfig.baseUrl;
            const modelsEndpoint =
                this.providerConfig.modelsEndpoint || '/models';
            const modelsUrl = modelsEndpoint.startsWith('http')
                ? modelsEndpoint
                : `${baseUrl}${modelsEndpoint.startsWith('/') ? '' : '/'}${modelsEndpoint}`;
            Logger.debug(
                `[${this.providerKey}] Fetching models from: ${modelsUrl}`
            );

            const abortController = new AbortController();
            const timeoutId = setTimeout(() => abortController.abort(), 15000); // 15 second timeout

            // Build headers - only add Authorization if apiKey is provided
            const headers: Record<string, string> = {
                'User-Agent': getUserAgent(),
                Accept: 'application/json'
            };
            if (apiKey) {
                headers.Authorization = `Bearer ${apiKey}`;
            }

            const resp = await fetch(modelsUrl, {
                method: 'GET',
                headers,
                signal: abortController.signal
            });

            clearTimeout(timeoutId);

            if (!resp.ok) {
                const _text = await resp.text();
                Logger.warn(
                    `[${this.providerKey}] Failed to fetch models: ${resp.status} ${resp.statusText}`
                );
                return [];
            }

            const parsed = await resp.json();
            const models = this.parseApiModelsResponse(parsed);
            Logger.info(
                `[${this.providerKey}] Successfully fetched ${models.length} models from API`
            );
            return models;
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                Logger.warn(
                    `[${this.providerKey}] Model fetch timeout (15s). Using pre-configured models.`
                );
            } else {
                Logger.warn(
                    `[${this.providerKey}] Error fetching models from API:`,
                    err instanceof Error ? err.message : String(err)
                );
            }
            return [];
        }
    }

    /**
     * Parse the API response and convert to LanguageModelChatInformation
     * Subclasses can override this to handle provider-specific response formats
     */
    protected parseApiModelsResponse(
        resp: unknown
    ): LanguageModelChatInformation[] {
        // Default implementation for OpenAI-compatible /v1/models response
        // Format: { data: [{ id: string, ... }] }
        const modelParser = this.providerConfig.modelParser;
        const arrayPath = modelParser?.arrayPath || 'data';
        const idField = modelParser?.idField || 'id';
        const nameField =
            modelParser?.nameField || modelParser?.descriptionField || 'id';

        // Get the models array from the response
        let modelsArray: any[] = [];
        if (arrayPath === '') {
            // Response is the array itself
            modelsArray = Array.isArray(resp) ? resp : [];
        } else {
            // Response is an object with the array at arrayPath
            const data = resp as Record<string, any>;
            modelsArray = data[arrayPath];

            // Fallback: if arrayPath is not found, check if the response itself is an array
            if (!modelsArray && Array.isArray(resp)) {
                modelsArray = resp;
            }

            // Fallback: if still not found, check common keys
            if (!modelsArray && data) {
                modelsArray = data.data || data.models || data.results || [];
            }

            // Fallback: if arrayPath is not found, check if the response itself is an array
            if (!modelsArray && Array.isArray(resp)) {
                modelsArray = resp;
            }

            // Fallback: if still not found, check common keys
            if (!modelsArray && data) {
                modelsArray = data.data || data.models || data.results || [];
            }
        }

        if (!Array.isArray(modelsArray)) {
            Logger.warn(
                `[${this.providerKey}] Invalid API response format: ${arrayPath} is not an array`
            );
            return [];
        }

        return modelsArray
            .map((m) => {
                const modelId = m[idField] as string | undefined;
                if (!modelId) {
                    return null;
                }

                const record = m as Record<string, unknown>;
                const contextLength =
                    getPositiveNumber(record.context_length) ??
                    getPositiveNumber(record.context_window);
                const advertisedMaxOutputTokens =
                    getPositiveNumber(record.max_tokens) ??
                    getPositiveNumber(record.max_output_tokens);
                const { maxInputTokens, maxOutputTokens } =
                    resolveAdvertisedTokenLimits(modelId, contextLength, {
                        defaultContextLength: DEFAULT_CONTEXT_LENGTH,
                        defaultMaxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
                        advertisedMaxOutputTokens
                    });

                const info: LanguageModelChatInformation = {
                    id: modelId,
                    name: this.formatModelName(
                        (m[nameField] as string) || modelId
                    ),
                    detail: this.providerConfig.displayName,
                    tooltip: `${modelId} via ${this.providerConfig.displayName}`,
                    family: this.providerKey,
                    maxInputTokens,
                    maxOutputTokens,
                    version: '1.0',
                    capabilities: {
                        toolCalling: true,
                        imageInput: false
                    }
                };
                return info;
            })
            .filter((m): m is LanguageModelChatInformation => m !== null);
    }

    /**
     * Format model ID into a display name
     */
    protected formatModelName(modelId: string): string {
        // Convert model IDs like "meta-llama/Llama-3.1-70B-Instruct" to "Llama 3.1 70B Instruct"
        return modelId
            .split(/[/:-]/)
            .map((part) => part.trim())
            .filter((part) => part.length > 0 && !part.match(/^v\d+$/))
            .join(' ');
    }

    /**
     * Get the config file path for this provider
     */
    protected getConfigFilePath(): string | undefined {
        // Look for the provider config file in the extension
        const configPath = path.join(
            this.context.extensionPath,
            'dist',
            'providers',
            'config',
            `${this.providerKey}.json`
        );
        try {
            // Use synchronous check for existence as it's faster for this use case
            const fsSync = require('node:fs');
            if (fsSync.existsSync(configPath)) {
                return configPath;
            }
        } catch {}
        return undefined;
    }

    /**
     * Update the provider's config file with new models
     * This allows automatic model list updates
     */
    protected async updateConfigFileAsync(
        models: LanguageModelChatInformation[]
    ): Promise<void> {
        const configPath = this.getConfigFilePath();
        if (!configPath) {
            Logger.debug(
                `[${this.providerKey}] No config file found to update`
            );
            return;
        }

        // Run in background using async fs
        this.writeConfigInBackground(configPath, models);
    }

    /**
     * Write config file in background (non-blocking)
     */
    private writeConfigInBackground(
        configPath: string,
        models: LanguageModelChatInformation[]
    ): void {
        // Use async fs operations to avoid blocking
        (async () => {
            try {
                // Read existing config
                let existingConfig: ProviderConfig;
                try {
                    const configContent = await fs.readFile(configPath, 'utf8');
                    existingConfig = JSON.parse(configContent);
                } catch {
                    existingConfig = {
                        displayName: this.providerConfig.displayName,
                        baseUrl: this.providerConfig.baseUrl,
                        apiKeyTemplate: this.providerConfig.apiKeyTemplate,
                        models: []
                    };
                }

                // Merge with existing static models, avoiding duplicates
                const existingModelIds = new Set(
                    existingConfig.models.map((m) => m.id)
                );
                const newModels: ModelConfig[] = models.map((m) => ({
                    id: m.id,
                    name: m.name || m.id,
                    tooltip: m.tooltip || m.id,
                    maxInputTokens: m.maxInputTokens,
                    maxOutputTokens: m.maxOutputTokens,
                    capabilities: {
                        toolCalling: Boolean(
                            m.capabilities?.toolCalling ?? true
                        ),
                        imageInput: Boolean(m.capabilities?.imageInput ?? false)
                    }
                }));

                // Add new models that don't already exist
                for (const newModel of newModels) {
                    if (!existingModelIds.has(newModel.id)) {
                        existingConfig.models.push(newModel);
                    }
                }

                // Write back to config file
                await fs.writeFile(
                    configPath,
                    JSON.stringify(existingConfig, null, 4),
                    'utf8'
                );
                Logger.info(
                    `[${this.providerKey}] Auto-updated config with ${newModels.length} new models`
                );
            } catch (err) {
                Logger.warn(
                    `[${this.providerKey}] Background config update failed:`,
                    err instanceof Error ? err.message : String(err)
                );
            }
        })();
    }

    /**
     * Check if dynamic model fetching is enabled for this provider
     * Can be overridden by subclasses
     */
    protected shouldFetchModelsFromApi(): boolean {
        // Only fetch if we have a valid baseUrl
        return (
            !!this.providerConfig.baseUrl &&
            this.providerConfig.baseUrl.startsWith('http')
        );
    }

    /**
     * Check if this provider has an open model endpoint (no API key required for fetching models)
     */
    protected hasOpenModelEndpoint(): boolean {
        return this.providerConfig.openModelEndpoint === true;
    }

    /**
     * Fetch models from API and update cache + config file asynchronously (non-blocking)
     */
    protected fetchAndUpdateModelsAsync(apiKey: string): void {
        (async () => {
            try {
                const apiModels = await this.fetchModelsFromApi(apiKey);
                if (apiModels.length > 0) {
                    Logger.debug(
                        `[${this.providerKey}] Updating with ${apiModels.length} models from API`
                    );
                    // Update config file in background
                    await this.updateConfigFileAsync(apiModels);
                    // Fire event to notify VS Code that models are available
                    this._onDidChangeLanguageModelChatInformation.fire();
                }
            } catch (err) {
                Logger.debug(
                    `[${this.providerKey}] Background model fetch failed:`,
                    err instanceof Error ? err.message : String(err)
                );
            }
        })();
    }

    async provideLanguageModelChatInformation(
        options: { silent: boolean },
        _token: CancellationToken
    ): Promise<LanguageModelChatInformation[]> {
        // Fast path: check cache
        try {
            const apiKeyHash = await this.getApiKeyHash();
            let cachedModels = await this.modelInfoCache?.getCachedModels(
                this.providerKey,
                apiKeyHash
            );

            if (cachedModels) {
                Logger.trace(
                    `[${this.providerKey}] Return model list from cache ` +
                        `(${cachedModels.length} models)`
                );

                // Read user's last selected model and mark as default (only if memory is enabled)
                const rememberLastModel = ConfigManager.getRememberLastModel();
                if (rememberLastModel) {
                    const lastSelectedId =
                        this.modelInfoCache?.getLastSelectedModel(
                            this.providerKey
                        );
                    if (lastSelectedId) {
                        cachedModels = cachedModels.map((model) => ({
                            ...model,
                            isDefault: model.id === lastSelectedId
                        }));
                    }
                }

                // Background asynchronous cache update (non-blocking, do not await)
                this.updateModelCacheAsync(apiKeyHash);

                // Also trigger background API fetch to update config files and cache if needed
                if (this.shouldFetchModelsFromApi() && !options.silent) {
                    if (this.hasOpenModelEndpoint()) {
                        const defaultKey =
                            KnownProviders[this.providerKey]?.defaultApiKey ||
                            '';
                        this.fetchAndUpdateModelsAsync(defaultKey);
                    } else {
                        ApiKeyManager.getApiKey(this.providerKey).then(
                            (apiKey) => {
                                if (apiKey) {
                                    this.fetchAndUpdateModelsAsync(apiKey);
                                }
                            }
                        );
                    }
                }

                return this.dedupeModelInfos(cachedModels);
            }
        } catch (err) {
            Logger.warn(
                `[${this.providerKey}] Cache query failed, falling back to original logic:`,
                err instanceof Error ? err.message : String(err)
            );
        }

        // Always return static config models first - no API key required for model listing
        // This allows providers to be registered with VS Code immediately without configuration
        let models = this.providerConfig.models.map((model) =>
            this.modelConfigToInfo(model)
        );

        // Try to fetch more models from API dynamically in background
        // Only attempt if we have a valid baseUrl (not needed for no-config providers)
        if (this.shouldFetchModelsFromApi()) {
            // Check if provider has open model endpoint (no API key required)
            if (this.hasOpenModelEndpoint() && !options.silent) {
                // Fetch models with default API key if available, otherwise without
                const defaultKey =
                    KnownProviders[this.providerKey]?.defaultApiKey || '';
                this.fetchAndUpdateModelsAsync(defaultKey);
            } else {
                // Try to get API key silently - won't prompt user
                const apiKey = await ApiKeyManager.getApiKey(this.providerKey);
                if (apiKey && !options.silent) {
                    // Fetch additional models from API in background (non-blocking)
                    this.fetchAndUpdateModelsAsync(apiKey);
                }
            }
        }

        // Read user's last selected model and mark as default (only if memory is enabled and provider matches)
        const rememberLastModel = ConfigManager.getRememberLastModel();
        if (rememberLastModel) {
            const lastSelectedId = this.modelInfoCache?.getLastSelectedModel(
                this.providerKey
            );
            if (lastSelectedId) {
                models = models.map((model) => ({
                    ...model,
                    isDefault: model.id === lastSelectedId
                }));
            }
        }

        // Asynchronously cache results (non-blocking)
        try {
            const apiKeyHash = await this.getApiKeyHash();
            this.updateModelCacheAsync(apiKeyHash, models);
        } catch (err) {
            Logger.warn(`[${this.providerKey}] Cache saving failed:`, err);
        }

        return this.dedupeModelInfos(models);
    }

    /**
     * Update model cache asynchronously (non-blocking)
     * @param apiKeyHash The API key hash for cache validation
     * @param models Optional models to cache (defaults to static config models)
     */
    protected updateModelCacheAsync(
        apiKeyHash: string,
        models?: LanguageModelChatInformation[]
    ): void {
        // Use Promise to execute in background, do not wait for result
        (async () => {
            try {
                let modelsToCache = models;
                if (!modelsToCache) {
                    modelsToCache = this.providerConfig.models.map((model) =>
                        this.modelConfigToInfo(model)
                    );
                }
                modelsToCache = this.dedupeModelInfos(modelsToCache);

                await this.modelInfoCache?.cacheModels(
                    this.providerKey,
                    modelsToCache,
                    apiKeyHash
                );
            } catch (err) {
                // Background update failure should not affect extension operation
                Logger.trace(
                    `[${this.providerKey}] Background cache update failed:`,
                    err instanceof Error ? err.message : String(err)
                );
            }
        })();
    }

    /**
     * Compute API key hash (used for cache check)
     */
    protected async getApiKeyHash(): Promise<string> {
        try {
            const apiKey = await ApiKeyManager.getApiKey(this.providerKey);
            if (!apiKey) {
                return 'no-key';
            }
            return await ModelInfoCache.computeApiKeyHash(apiKey);
        } catch (err) {
            Logger.warn(
                `[${this.providerKey}] Failed to compute API key hash:`,
                err instanceof Error ? err.message : String(err)
            );
            return 'hash-error';
        }
    }

    async provideLanguageModelChatResponse(
        model: LanguageModelChatInformation,
        messages: Array<LanguageModelChatMessage>,
        options: ProvideLanguageModelChatResponseOptions,
        progress: Progress<vscode.LanguageModelResponsePart>,
        token: CancellationToken
    ): Promise<void> {
        const hideThinkingInUI = ConfigManager.getHideThinkingInUI();
        const effectiveProgress: Progress<vscode.LanguageModelResponsePart2> =
            hideThinkingInUI
                ? {
                      report: (part) => {
                          if (
                              part instanceof vscode.LanguageModelThinkingPart
                          ) {
                              return;
                          }
                          (
                              progress as Progress<vscode.LanguageModelResponsePart2>
                          ).report(part);
                      }
                  }
                : (progress as Progress<vscode.LanguageModelResponsePart2>);

        // Save user's selected model and its provider (only if memory is enabled)
        const rememberLastModel = ConfigManager.getRememberLastModel();
        if (rememberLastModel) {
            this.modelInfoCache
                ?.saveLastSelectedModel(this.providerKey, model.id)
                .catch((err) =>
                    Logger.warn(
                        `[${this.providerKey}] Failed to save model selection:`,
                        err
                    )
                );
        }

        // Find corresponding model configuration
        const modelConfig = this.providerConfig.models.find(
            (m: ModelConfig) => m.id === model.id || m.model === model.id
        );
        if (!modelConfig) {
            const errorMessage = `Model not found: ${model.id}`;
            Logger.error(errorMessage);
            throw new Error(errorMessage);
        }

        // Determine actual provider based on provider field in model configuration
        const effectiveProviderKey = modelConfig.provider || this.providerKey;

        try {
            const accounts =
                this.accountManager.getAccountsByProvider(effectiveProviderKey);
            const loadBalanceEnabled =
                this.accountManager.getLoadBalanceEnabled(effectiveProviderKey);
            const assignedAccountId = this.accountManager.getAccountIdForModel(
                effectiveProviderKey,
                model.id
            );

            // If no accounts managed by AccountManager, fall back to ApiKeyManager
            if (accounts.length === 0) {
                await ApiKeyManager.ensureApiKey(
                    effectiveProviderKey,
                    this.providerConfig.displayName
                );

                const sdkMode = modelConfig.sdkMode || 'openai';
                Logger.info(
                    `${this.providerConfig.displayName} Provider starts processing request (fallback mode): ${modelConfig.name}`
                );

                if (sdkMode === 'anthropic') {
                    await this.anthropicHandler.handleRequest(
                        model,
                        modelConfig,
                        messages,
                        options,
                        effectiveProgress,
                        token
                    );
                } else if (sdkMode === 'oai-response') {
                    await this.responsesHandler.handleRequest(
                        model,
                        modelConfig,
                        messages,
                        options,
                        effectiveProgress,
                        token
                    );
                } else {
                    await this.openaiHandler.handleRequest(
                        model,
                        modelConfig,
                        messages,
                        options,
                        effectiveProgress,
                        token
                    );
                }
                return;
            }

            // Use AccountManager for multi-account support
            const usableAccounts =
                accounts.filter((a) => a.status === 'active').length > 0
                    ? accounts.filter((a) => a.status === 'active')
                    : accounts;

            const candidates = this.buildAccountCandidates(
                model.id,
                usableAccounts,
                assignedAccountId,
                loadBalanceEnabled,
                effectiveProviderKey
            );

            const activeAccount =
                this.accountManager.getActiveAccount(effectiveProviderKey);

            let refreshedAvailable = candidates.filter(
                (a) => !this.accountManager.isAccountQuotaLimited(a.id)
            );

            while (refreshedAvailable.length === 0) {
                if (token.isCancellationRequested) {
                    throw new vscode.CancellationError();
                }

                const shortestCooldownAccount =
                    this.accountManager.getAccountWithShortestCooldown(
                        effectiveProviderKey
                    );
                const waitMs = shortestCooldownAccount
                    ? this.accountManager.getAccountQuotaCooldown(
                          shortestCooldownAccount.id
                      )
                    : 0;

                if (waitMs <= 0) {
                    break;
                }

                Logger.warn(
                    `[${effectiveProviderKey}] All accounts are rate-limited. Waiting ${Math.ceil(waitMs / 1000)}s before retrying ${shortestCooldownAccount?.displayName || 'the next account'}.`
                );
                await new Promise((resolve) => setTimeout(resolve, waitMs));

                refreshedAvailable = candidates.filter(
                    (a) => !this.accountManager.isAccountQuotaLimited(a.id)
                );
            }

            let accountsToTry: Account[];
            if (refreshedAvailable.length > 0) {
                if (
                    activeAccount &&
                    refreshedAvailable.some((a) => a.id === activeAccount.id)
                ) {
                    accountsToTry = [
                        activeAccount,
                        ...refreshedAvailable.filter(
                            (a) => a.id !== activeAccount.id
                        )
                    ];
                } else {
                    accountsToTry = refreshedAvailable;
                }
            } else {
                accountsToTry = [];
            }

            Logger.debug(
                `[${effectiveProviderKey}] Active account: ${activeAccount?.displayName || 'none'}, accountsToTry: ${accountsToTry.map((a) => a.displayName).join(', ')}`
            );

            let lastError: unknown;
            let switchedAccount = false;

            if (accountsToTry.length === 0) {
                lastError = new Error(
                    `All accounts for ${effectiveProviderKey} are currently rate-limited. Please wait and try again.`
                );
            }

            for (const account of accountsToTry) {
                const credentials = await this.accountManager.getCredentials(
                    account.id
                );
                if (!credentials) {
                    lastError = new Error(
                        `Missing credentials for ${account.displayName}`
                    );
                    continue;
                }

                // Prepare model config with account-specific credentials
                const configWithAuth: ModelConfig = {
                    ...modelConfig,
                    apiKey:
                        'apiKey' in credentials
                            ? credentials.apiKey
                            : undefined,
                    baseUrl:
                        'endpoint' in credentials
                            ? credentials.endpoint
                            : undefined,
                    customHeader:
                        'customHeaders' in credentials
                            ? credentials.customHeaders
                            : undefined
                };

                // Override baseUrl with language model configuration baseUrl if available (lower priority than account endpoint)
                const selectionsMetadata = (options as any)?.selectionsMetadata;
                if (!configWithAuth.baseUrl && selectionsMetadata?.baseUrl) {
                    configWithAuth.baseUrl = selectionsMetadata.baseUrl;
                }

                // Handle OAuth tokens if needed
                if ('accessToken' in credentials) {
                    // For OAuth accounts, we might need to refresh or pass the token differently
                    // Currently most GenericModelProvider models use API Key
                    (configWithAuth as any).accessToken =
                        credentials.accessToken;
                    configWithAuth.apiKey = credentials.accessToken; // Often used as bearer token
                }

                try {
                    const sdkMode = modelConfig.sdkMode || 'openai';
                    Logger.info(
                        `${this.providerConfig.displayName}: ${model.name} using account "${account.displayName}" (ID: ${account.id})`
                    );

                    if (sdkMode === 'anthropic') {
                        await this.anthropicHandler.handleRequest(
                            model,
                            configWithAuth,
                            messages,
                            options,
                            effectiveProgress,
                            token,
                            account.id
                        );
                    } else if (sdkMode === 'oai-response') {
                        await this.responsesHandler.handleRequest(
                            model,
                            configWithAuth,
                            messages,
                            options,
                            effectiveProgress,
                            token,
                            account.id
                        );
                    } else {
                        await this.openaiHandler.handleRequest(
                            model,
                            configWithAuth,
                            messages,
                            options,
                            effectiveProgress,
                            token,
                            account.id
                        );
                    }

                    this.lastUsedAccountByModel.set(model.id, account.id);

                    if (switchedAccount) {
                        if (loadBalanceEnabled) {
                            const switched =
                                await this.accountManager.switchAccount(
                                    effectiveProviderKey,
                                    account.id
                                );
                            if (!switched) {
                                Logger.warn(
                                    `[${effectiveProviderKey}] Failed to persist automatic account switch to ${account.displayName}`
                                );
                            }
                        }
                        Logger.info(
                            `[${effectiveProviderKey}] Saving account "${account.displayName}" as preferred for model ${model.id}`
                        );
                        await this.accountManager.setAccountForModel(
                            effectiveProviderKey,
                            model.id,
                            account.id
                        );
                    }
                    return;
                } catch (error) {
                    switchedAccount = true;
                    // Check if it's a rate limit error that should be retried internally
                    if (RetryManager.isRateLimitError(error)) {
                        Logger.warn(
                            `[${effectiveProviderKey}] Account ${account.displayName} rate limited, will retry automatically...`
                        );
                        lastError = error;
                        // If load balancing is enabled, try next account
                        if (loadBalanceEnabled) {
                            continue;
                        }
                        // If only one account, retry the same account by continuing the loop
                        // The outer retry logic in handlers will handle the actual delay
                        continue;
                    }
                    if (this.isLongTermQuotaExhausted(error)) {
                        if (loadBalanceEnabled) {
                            Logger.warn(
                                `[${effectiveProviderKey}] Account ${account.displayName} quota exhausted, switching...`
                            );
                            lastError = error;
                            continue;
                        }
                        throw error;
                    }
                    if (loadBalanceEnabled && this.isQuotaError(error)) {
                        Logger.warn(
                            `[${effectiveProviderKey}] Account ${account.displayName} rate limited, switching...`
                        );
                        lastError = error;
                        continue;
                    }
                    throw error;
                }
            }

            if (lastError) {
                throw lastError;
            }
            throw new Error(
                `No available accounts for ${effectiveProviderKey}`
            );
        } catch (error) {
            const errorMessage = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
            Logger.error(errorMessage);
            throw error;
        } finally {
            Logger.info(
                `${this.providerConfig.displayName}: ${model.name} Request completed`
            );
        }
    }

    protected buildAccountCandidates(
        modelId: string,
        accounts: Account[],
        assignedAccountId: string | undefined,
        loadBalanceEnabled: boolean,
        providerKey: string
    ): Account[] {
        if (accounts.length === 0) {
            return [];
        }
        const assignedAccount = assignedAccountId
            ? accounts.find((a) => a.id === assignedAccountId)
            : undefined;
        const activeAccount = this.accountManager.getActiveAccount(providerKey);
        const defaultAccount =
            activeAccount || accounts.find((a) => a.isDefault) || accounts[0];

        if (!loadBalanceEnabled) {
            return assignedAccount
                ? [assignedAccount]
                : defaultAccount
                  ? [defaultAccount]
                  : [];
        }

        const ordered = [...accounts].sort(
            (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
        );
        const lastUsed = this.lastUsedAccountByModel.get(modelId);
        let rotatedOrder = ordered;
        if (lastUsed) {
            const index = ordered.findIndex((a) => a.id === lastUsed);
            if (index >= 0) {
                rotatedOrder = [
                    ...ordered.slice(index + 1),
                    ...ordered.slice(0, index + 1)
                ];
            }
        }
        if (assignedAccount) {
            return [
                assignedAccount,
                ...rotatedOrder.filter((a) => a.id !== assignedAccount.id)
            ];
        }
        if (defaultAccount) {
            return [
                defaultAccount,
                ...rotatedOrder.filter((a) => a.id !== defaultAccount.id)
            ];
        }
        return rotatedOrder;
    }

    protected isQuotaError(error: unknown): boolean {
        if (!(error instanceof Error)) {
            return false;
        }
        const msg = error.message;
        return (
            msg.startsWith('Quota exceeded') ||
            msg.startsWith('Rate limited') ||
            msg.includes('HTTP 429') ||
            msg.includes('"code": 429') ||
            msg.includes('"code":429') ||
            msg.includes('RESOURCE_EXHAUSTED') ||
            (msg.includes('429') && msg.includes('Resource has been exhausted'))
        );
    }

    protected isLongTermQuotaExhausted(error: unknown): boolean {
        return (
            error instanceof Error &&
            error.message.startsWith('Account quota exhausted')
        );
    }

    async provideTokenCount(
        model: LanguageModelChatInformation,
        text: string | LanguageModelChatMessage | LanguageModelChatMessage2,
        _token: CancellationToken
    ): Promise<number> {
        return TokenCounter.getInstance().countTokens(model, text);
    }

    /**
     * Calculate total tokens for multiple messages
     */
    protected async countMessagesTokens(
        model: LanguageModelChatInformation,
        messages: Array<LanguageModelChatMessage | LanguageModelChatMessage2>,
        modelConfig?: ModelConfig,
        options?: ProvideLanguageModelChatResponseOptions
    ): Promise<number> {
        return TokenCounter.getInstance().countMessagesTokens(
            model,
            messages,
            modelConfig,
            options
        );
    }
}
