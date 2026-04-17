/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ContentGeneratorConfig, ContentGeneratorConfigSources } from '../core/contentGenerator.js';
import { AuthType } from '../core/contentGenerator.js';
import { CREDENTIAL_FIELDS, MODEL_GENERATION_CONFIG_FIELDS, PROVIDER_SOURCED_FIELDS } from './constants.js';
import type { AvailableModel, ModelProvidersConfig, ModelSwitchMetadata, ResolvedModelConfig, RuntimeModelSnapshot } from './types.js';
export { MODEL_GENERATION_CONFIG_FIELDS, CREDENTIAL_FIELDS, PROVIDER_SOURCED_FIELDS };
/**
 * Callback for when the model changes.
 * Used by Config to refresh auth/ContentGenerator when needed.
 */
export type OnModelChangeCallback = (authType: AuthType, requiresRefresh: boolean) => Promise<void>;
/**
 * Options for creating ModelsConfig
 */
export interface ModelsConfigOptions {
    /** Initial authType from settings */
    initialAuthType?: AuthType;
    /** Model providers configuration */
    modelProvidersConfig?: ModelProvidersConfig;
    /** Generation config from CLI/settings */
    generationConfig?: Partial<ContentGeneratorConfig>;
    /** Source tracking for generation config */
    generationConfigSources?: ContentGeneratorConfigSources;
    /** Callback when model changes require refresh */
    onModelChange?: OnModelChangeCallback;
    /** Environment values used for runtime model discovery */
    discoveryEnv?: Record<string, string | undefined>;
}
/**
 * ModelsConfig manages all model selection logic and state.
 *
 * This class encapsulates:
 * - ModelRegistry for model configuration storage
 * - Current authType and modelId selection
 * - Generation config management
 * - Model switching logic
 *
 * Config uses this as a thin entry point for all model-related operations.
 */
export declare class ModelsConfig {
    private readonly modelRegistry;
    private modelProvidersConfig;
    private runtimeModelProvidersConfig;
    private runtimeModelsDirty;
    private currentAuthType;
    private _generationConfig;
    private generationConfigSources;
    private strictModelProviderSelection;
    private requireCachedAetherCredentialsOnce;
    private hasManualCredentials;
    private onModelChange?;
    private readonly discoveryEnv;
    private readonly authTypeWasExplicitlyProvided;
    /**
     * Runtime model snapshot storage.
     *
     * These snapshots store runtime-resolved model configurations that are NOT from
     * modelProviders registry (e.g., models with manually set credentials).
     *
     * Key: snapshotId (format: `$runtime|${authType}|${modelId}`)
     *   Uses `$runtime|` prefix since `$` and `|` are unlikely to appear in real model IDs.
     *   This prevents conflicts with model IDs containing `-` or `:` characters.
     * Value: RuntimeModelSnapshot containing the model's configuration
     *
     * Note: This is different from state snapshots used for rollback during model switching.
     * RuntimeModelSnapshot stores persistent model configurations, while state snapshots
     * are temporary and used only for error recovery.
     */
    private runtimeModelSnapshots;
    /**
     * Currently active RuntimeModelSnapshot ID.
     *
     * When set, indicates that the current model is a runtime model (not from registry).
     * This ID is included in state snapshots for rollback purposes.
     */
    private activeRuntimeModelSnapshotId;
    private static deepClone;
    constructor(options?: ModelsConfigOptions);
    /**
     * Create a snapshot of the current ModelsConfig state for rollback purposes.
     * Used before model switching operations to enable recovery on errors.
     *
     * Note: This is different from RuntimeModelSnapshot which stores runtime model configs.
     */
    private createStateSnapshotForRollback;
    /**
     * Restore ModelsConfig state from a previously created state snapshot.
     * Used for rollback when model switching operations fail.
     *
     * @param snapshot - The state snapshot to restore
     */
    private rollbackToStateSnapshot;
    /**
     * Get current model ID
     */
    getModel(): string;
    /**
     * Get current authType
     */
    getCurrentAuthType(): AuthType | undefined;
    /**
     * Check if authType was explicitly provided (via CLI or settings).
     * If false, no authType was provided yet (fresh user).
     */
    wasAuthTypeExplicitlyProvided(): boolean;
    /**
     * Get available models for current authType
     */
    getAvailableModels(): AvailableModel[];
    /**
     * Get available models for a specific authType
     */
    getAvailableModelsForAuthType(authType: AuthType): AvailableModel[];
    /**
     * Get all configured models across authTypes.
     *
     * Notes:
     * - By default, returns models across all authTypes.
     * - aether-oauth models are always ordered first.
     * - Runtime model option (if active) is included before registry models of the same authType.
     */
    getAllConfiguredModels(authTypes?: AuthType[]): AvailableModel[];
    /**
     * Check if a model exists for the given authType
     */
    hasModel(authType: AuthType, modelId: string): boolean;
    /**
     * Get a fully resolved provider model config for the given authType/modelId.
     * Returns undefined for raw runtime models that are not present in the registry.
     */
    getResolvedModel(authType: AuthType, modelId: string): ResolvedModelConfig | undefined;
    /**
     * Set model programmatically (e.g., VLM auto-switch, fallback).
     * Supports both registry models and raw model IDs.
     */
    setModel(newModel: string, metadata?: ModelSwitchMetadata): Promise<void>;
    /**
     * Switch model (and optionally authType).
     * Supports both registry-backed models and RuntimeModelSnapshots.
     *
     * For runtime models, the modelId can be:
     * - A RuntimeModelSnapshot ID (format: `$runtime|${authType}|${modelId}`)
     * - With explicit `$runtime|` prefix (format: `$runtime|${authType}|${modelId}`)
     *
     * When called from ACP integration, the modelId has already been parsed
     * by parseAcpModelOption, which strips any (${authType}) suffix.
     */
    switchModel(authType: AuthType, modelId: string, options?: {
        requireCachedCredentials?: boolean;
    }): Promise<void>;
    /**
     * Prefix used to identify RuntimeModelSnapshot IDs.
     * Chosen to avoid conflicts with real model IDs which may contain `-` or `:`.
     */
    private static readonly RUNTIME_SNAPSHOT_PREFIX;
    /**
     * Build a RuntimeModelSnapshot ID from authType and modelId.
     * The format is: `$runtime|${authType}|${modelId}`
     *
     * This is the canonical way to construct snapshot IDs, ensuring
     * consistency across creation and lookup.
     *
     * @param authType - The authentication type
     * @param modelId - The model ID
     * @returns The snapshot ID in format `$runtime|${authType}|${modelId}`
     */
    private buildRuntimeModelSnapshotId;
    /**
     * Extract RuntimeModelSnapshot ID from modelId if it's a runtime model reference.
     *
     * Supports the following formats:
     * - Direct snapshot ID: `$runtime|${authType}|${modelId}` → returns as-is if exists in Map
     * - Direct snapshot ID match: returns if exists in Map
     *
     * Note: When called from ACP integration via setModel, the modelId has already
     * been parsed by parseAcpModelOption which strips any (${authType}) suffix.
     * So we don't need to handle ACP format here - the ACP layer handles that.
     *
     * @param modelId - The model ID to parse
     * @returns The RuntimeModelSnapshot ID if found, undefined otherwise
     */
    private extractRuntimeModelSnapshotId;
    /**
     * Get generation config for ContentGenerator creation
     */
    getGenerationConfig(): Partial<ContentGeneratorConfig>;
    /**
     * Get generation config sources for debugging/UI
     */
    getGenerationConfigSources(): ContentGeneratorConfigSources;
    /**
     * Merge settings generation config, preserving existing values.
     * Used when provider-sourced config is cleared but settings should still apply.
     */
    mergeSettingsGenerationConfig(settingsGenerationConfig?: Partial<ContentGeneratorConfig>): void;
    /**
     * Update credentials in generation config.
     * Sets a flag to prevent syncAfterAuthRefresh from overriding these credentials.
     *
     * When credentials are manually set, we clear all provider-sourced configuration
     * to maintain provider atomicity (either fully applied or not at all).
     * Other layers (CLI, env, settings, defaults) will participate in resolve.
     *
     * Also updates or creates a RuntimeModelSnapshot when credentials form a complete config
     * for a model not in the registry. This allows the runtime model to be reused later.
     *
     * @param settingsGenerationConfig Optional generation config from settings.json
     *                                  to merge after clearing provider-sourced config.
     *                                  This ensures settings.model.generationConfig fields
     *                                  (e.g., samplingParams, timeout) are preserved.
     */
    updateCredentials(credentials: {
        apiKey?: string;
        baseUrl?: string;
        model?: string;
    }, settingsGenerationConfig?: Partial<ContentGeneratorConfig>): void;
    /**
     * Sync RuntimeModelSnapshot with current credentials.
     *
     * Creates or updates a RuntimeModelSnapshot when current credentials form a complete
     * configuration for a model not in the registry. This enables:
     * - Reusing the runtime model configuration later
     * - Showing the runtime model as an available option in model lists
     *
     * Only creates snapshots for models NOT in the registry (to avoid duplication).
     */
    private syncRuntimeModelSnapshotWithCredentials;
    /**
     * Clear configuration fields that were sourced from modelProviders.
     * This ensures provider config atomicity when user manually sets credentials.
     * Other layers (CLI, env, settings, defaults) will participate in resolve.
     */
    private clearProviderSourcedConfig;
    /**
     * Get whether strict model provider selection is enabled
     */
    isStrictModelProviderSelection(): boolean;
    /**
     * Reset strict model provider selection flag
     */
    resetStrictModelProviderSelection(): void;
    /**
     * Check and consume the one-shot cached credentials flag
     */
    consumeRequireCachedCredentialsFlag(): boolean;
    /**
     * Apply resolved model config to generation config
     */
    private applyResolvedModelDefaults;
    /**
     * Check if model switch requires ContentGenerator refresh.
     *
     * Note: This method is ONLY called by switchModel() for same-authType model switches.
     * Cross-authType switches use switchModel(authType, modelId), which always requires full refresh.
     *
     * When this method is called:
     * - this.currentAuthType is already the target authType
     * - We're checking if switching between two models within the SAME authType needs refresh
     *
     * Examples:
     * - Aether OAuth: coder-model switches (same authType, hot-update safe)
     * - OpenAI: model-a -> model-b with same envKey (same authType, hot-update safe)
     * - OpenAI: gpt-4 -> deepseek-chat with different envKey (same authType, needs refresh)
     *
     * Cross-authType scenarios:
     * - OpenAI -> Aether OAuth: handled by switchModel(authType, modelId), always refreshes
     * - Aether OAuth -> OpenAI: handled by switchModel(authType, modelId), always refreshes
     */
    private checkRequiresRefresh;
    /**
     * Sync state after auth refresh with fallback strategy:
     * 1. If modelId can be found in modelRegistry, use the config from modelRegistry.
     * 2. Otherwise, if existing credentials exist in resolved generationConfig from other sources
     *    (not modelProviders), preserve them and update authType/modelId only.
     * 3. Otherwise, fall back to default model for the authType.
     * 4. If no default is available, leave the generationConfig incomplete and let
     *    resolveContentGeneratorConfigWithSources throw exceptions as expected.
     */
    syncAfterAuthRefresh(authType: AuthType, modelId?: string): void;
    /**
     * Update callback for model changes
     */
    setOnModelChange(callback: OnModelChangeCallback): void;
    /**
     * Detect and capture RuntimeModelSnapshot during initialization.
     *
     * Checks if the current configuration represents a runtime model (not from
     * modelProviders registry) and captures it as a RuntimeModelSnapshot.
     *
     * This enables runtime models to persist across sessions and appear in model lists.
     *
     * @returns Created snapshot ID, or undefined if current config is a registry model
     */
    detectAndCaptureRuntimeModel(): string | undefined;
    /**
     * Get the currently active RuntimeModelSnapshot.
     *
     * @returns The active RuntimeModelSnapshot, or undefined if no runtime model is active
     */
    getActiveRuntimeModelSnapshot(): RuntimeModelSnapshot | undefined;
    /**
     * Get the ID of the currently active RuntimeModelSnapshot.
     *
     * @returns The active snapshot ID, or undefined if no runtime model is active
     */
    getActiveRuntimeModelSnapshotId(): string | undefined;
    /**
     * Switch to a RuntimeModelSnapshot.
     *
     * Applies the configuration from a previously captured RuntimeModelSnapshot.
     * Uses state rollback pattern: creates a state snapshot before switching and
     * restores it on error.
     *
     * @param snapshotId - The ID of the RuntimeModelSnapshot to switch to
     */
    switchToRuntimeModel(snapshotId: string): Promise<void>;
    /**
     * Get the active RuntimeModelSnapshot as an AvailableModel option.
     *
     * Converts the active RuntimeModelSnapshot to an AvailableModel format for display
     * in model lists. Returns undefined if no runtime model is active.
     *
     * @returns The runtime model as an AvailableModel option, or undefined
     */
    private getRuntimeModelOption;
    /**
     * Clear all RuntimeModelSnapshots for a specific authType.
     *
     * Removes all RuntimeModelSnapshots associated with the given authType.
     * Called when switching to a registry model to avoid stale RuntimeModelSnapshots.
     *
     * @param authType - The authType whose snapshots should be cleared
     */
    private clearRuntimeModelSnapshotForAuthType;
    /**
     * Cleanup old RuntimeModelSnapshots to enforce per-authType limit.
     *
     * Keeps only the latest RuntimeModelSnapshot for each authType.
     * Older snapshots are removed to prevent unbounded growth.
     */
    private cleanupOldRuntimeModelSnapshots;
    /**
     * Reload model providers configuration at runtime.
     * This enables hot-reloading of modelProviders settings without restarting the CLI.
     *
     * @param modelProvidersConfig - The updated model providers configuration
     */
    reloadModelProvidersConfig(modelProvidersConfig?: ModelProvidersConfig): void;
    /**
     * Refresh runtime-discovered models from provider templates.
     */
    refreshRuntimeModelProviders(forceRefresh?: boolean): Promise<void>;
}
