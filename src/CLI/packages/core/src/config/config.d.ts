/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { EventEmitter } from 'node:events';
import { ArenaAgentClient } from '../agents/arena/ArenaAgentClient.js';
import type { ArenaManager } from '../agents/arena/ArenaManager.js';
import { MessageBus } from '../confirmation-bus/message-bus.js';
import { BaseLlmClient } from '../core/baseLlmClient.js';
import { GeminiClient } from '../core/client.js';
import type { ContentGenerator, ContentGeneratorConfig, ContentGeneratorConfigSources } from '../core/contentGenerator.js';
import { AuthType } from '../core/contentGenerator.js';
import type { ClaudeMarketplaceConfig } from '../extension/claude-converter.js';
import { type Extension, ExtensionManager } from '../extension/extensionManager.js';
import { HookSystem } from '../hooks/index.js';
import type { LspClient } from '../lsp/types.js';
import type { MCPOAuthConfig } from '../mcp/oauth-provider.js';
import { type AvailableModel, type ModelProvidersConfig, ModelsConfig, type RuntimeModelSnapshot } from '../models/index.js';
import { InputFormat, OutputFormat } from '../output/types.js';
import { PermissionManager } from '../permissions/permission-manager.js';
import { PromptRegistry } from '../prompts/prompt-registry.js';
import { ChatRecordingService } from '../services/chatRecordingService.js';
import { CronScheduler } from '../services/cronScheduler.js';
import { FileDiscoveryService } from '../services/fileDiscoveryService.js';
import { type FileEncodingType, type FileSystemService } from '../services/fileSystemService.js';
import { GitService } from '../services/gitService.js';
import { type ResumedSessionData, SessionService } from '../services/sessionService.js';
import type { ShellExecutionConfig } from '../services/shellExecutionService.js';
import { SkillManager } from '../skills/skill-manager.js';
import { SubagentManager } from '../subagents/subagent-manager.js';
import type { SubagentConfig } from '../subagents/types.js';
import { type TelemetryTarget } from '../telemetry/index.js';
import type { SendSdkMcpMessage } from '../tools/mcp-client.js';
import { ToolRegistry } from '../tools/tool-registry.js';
import type { AnyToolInvocation } from '../tools/tools.js';
import { type DebugLogger } from '../utils/debugLogger.js';
import { FileExclusions } from '../utils/ignorePatterns.js';
import { WorkspaceContext } from '../utils/workspaceContext.js';
import type { FileFilteringOptions } from './constants.js';
import { DEFAULT_FILE_FILTERING_OPTIONS, DEFAULT_MEMORY_FILE_FILTERING_OPTIONS } from './constants.js';
import { Storage } from './storage.js';
export type { AnyToolInvocation, FileFilteringOptions, MCPOAuthConfig };
export { DEFAULT_FILE_FILTERING_OPTIONS, DEFAULT_MEMORY_FILE_FILTERING_OPTIONS };
export declare enum ApprovalMode {
    PLAN = "plan",
    DEFAULT = "default",
    AUTO_EDIT = "auto-edit",
    YOLO = "yolo"
}
export declare const APPROVAL_MODES: ApprovalMode[];
/**
 * Information about an approval mode including display name and description.
 */
export interface ApprovalModeInfo {
    id: ApprovalMode;
    name: string;
    description: string;
}
/**
 * Detailed information about each approval mode.
 * Used for UI display and protocol responses.
 */
export declare const APPROVAL_MODE_INFO: Record<ApprovalMode, ApprovalModeInfo>;
export interface AccessibilitySettings {
    enableLoadingPhrases?: boolean;
    screenReader?: boolean;
}
export interface BugCommandSettings {
    urlTemplate: string;
}
export interface ChatCompressionSettings {
    contextPercentageThreshold?: number;
}
export interface TelemetrySettings {
    enabled?: boolean;
    target?: TelemetryTarget;
    otlpEndpoint?: string;
    otlpProtocol?: 'grpc' | 'http';
    logPrompts?: boolean;
    outfile?: string;
    useCollector?: boolean;
}
export interface OutputSettings {
    format?: OutputFormat;
}
export interface GitCoAuthorSettings {
    enabled?: boolean;
    name?: string;
    email?: string;
}
export type ExtensionOriginSource = 'Aether' | 'Claude' | 'Gemini';
export interface ExtensionInstallMetadata {
    source: string;
    type: 'git' | 'local' | 'link' | 'github-release' | 'npm';
    originSource?: ExtensionOriginSource;
    releaseTag?: string;
    registryUrl?: string;
    ref?: string;
    autoUpdate?: boolean;
    allowPreRelease?: boolean;
    marketplaceConfig?: ClaudeMarketplaceConfig;
    pluginName?: string;
}
export declare const DEFAULT_TRUNCATE_TOOL_OUTPUT_THRESHOLD = 25000;
export declare const DEFAULT_TRUNCATE_TOOL_OUTPUT_LINES = 1000;
export declare class MCPServerConfig {
    readonly command?: string | undefined;
    readonly args?: string[] | undefined;
    readonly env?: Record<string, string> | undefined;
    readonly cwd?: string | undefined;
    readonly url?: string | undefined;
    readonly httpUrl?: string | undefined;
    readonly headers?: Record<string, string> | undefined;
    readonly tcp?: string | undefined;
    readonly timeout?: number | undefined;
    readonly trust?: boolean | undefined;
    readonly description?: string | undefined;
    readonly includeTools?: string[] | undefined;
    readonly excludeTools?: string[] | undefined;
    readonly extensionName?: string | undefined;
    readonly oauth?: MCPOAuthConfig | undefined;
    readonly authProviderType?: AuthProviderType | undefined;
    readonly targetAudience?: string | undefined;
    readonly targetServiceAccount?: string | undefined;
    readonly type?: "sdk" | undefined;
    constructor(command?: string | undefined, args?: string[] | undefined, env?: Record<string, string> | undefined, cwd?: string | undefined, url?: string | undefined, httpUrl?: string | undefined, headers?: Record<string, string> | undefined, tcp?: string | undefined, timeout?: number | undefined, trust?: boolean | undefined, description?: string | undefined, includeTools?: string[] | undefined, excludeTools?: string[] | undefined, extensionName?: string | undefined, oauth?: MCPOAuthConfig | undefined, authProviderType?: AuthProviderType | undefined, targetAudience?: string | undefined, targetServiceAccount?: string | undefined, type?: "sdk" | undefined);
}
/**
 * Check if an MCP server config represents an SDK server
 */
export declare function isSdkMcpServerConfig(config: MCPServerConfig): boolean;
export declare enum AuthProviderType {
    DYNAMIC_DISCOVERY = "dynamic_discovery",
    GOOGLE_CREDENTIALS = "google_credentials",
    SERVICE_ACCOUNT_IMPERSONATION = "service_account_impersonation"
}
export interface SandboxConfig {
    command: 'docker' | 'podman' | 'sandbox-exec';
    image: string;
}
/**
 * Settings shared across multi-agent collaboration features
 * (Arena, Team, Swarm).
 */
export interface AgentsCollabSettings {
    /** Display mode for multi-agent sessions ('in-process' | 'tmux' | 'iterm2') */
    displayMode?: string;
    /** Arena-specific settings */
    arena?: {
        /** Custom base directory for Arena worktrees (default: ~/.aether/arena) */
        worktreeBaseDir?: string;
        /** Preserve worktrees and state files after session ends */
        preserveArtifacts?: boolean;
        /** Maximum rounds (turns) per agent. No limit if unset. */
        maxRoundsPerAgent?: number;
        /** Total timeout in seconds for the Arena session. No limit if unset. */
        timeoutSeconds?: number;
    };
}
export interface ConfigParameters {
    sessionId?: string;
    sessionData?: ResumedSessionData;
    embeddingModel?: string;
    sandbox?: SandboxConfig;
    targetDir: string;
    debugMode: boolean;
    includePartialMessages?: boolean;
    question?: string;
    systemPrompt?: string;
    appendSystemPrompt?: string;
    coreTools?: string[];
    allowedTools?: string[];
    excludeTools?: string[];
    /** Merged permission rules from all sources (settings + CLI args). */
    permissions?: {
        allow?: string[];
        ask?: string[];
        deny?: string[];
    };
    toolDiscoveryCommand?: string;
    toolCallCommand?: string;
    mcpServerCommand?: string;
    mcpServers?: Record<string, MCPServerConfig>;
    lsp?: {
        enabled?: boolean;
    };
    lspClient?: LspClient;
    userMemory?: string;
    geminiMdFileCount?: number;
    approvalMode?: ApprovalMode;
    contextFileName?: string | string[];
    accessibility?: AccessibilitySettings;
    telemetry?: TelemetrySettings;
    gitCoAuthor?: boolean;
    usageStatisticsEnabled?: boolean;
    fileFiltering?: {
        respectGitIgnore?: boolean;
        respectAetherIgnore?: boolean;
        respectQwenIgnore?: boolean;
        enableRecursiveFileSearch?: boolean;
        enableFuzzySearch?: boolean;
    };
    checkpointing?: boolean;
    proxy?: string;
    cwd: string;
    fileDiscoveryService?: FileDiscoveryService;
    includeDirectories?: string[];
    bugCommand?: BugCommandSettings;
    model?: string;
    outputLanguageFilePath?: string;
    maxSessionTurns?: number;
    sessionTokenLimit?: number;
    experimentalZedIntegration?: boolean;
    cronEnabled?: boolean;
    listExtensions?: boolean;
    overrideExtensions?: string[];
    allowedMcpServers?: string[];
    excludedMcpServers?: string[];
    noBrowser?: boolean;
    folderTrustFeature?: boolean;
    folderTrust?: boolean;
    ideMode?: boolean;
    authType?: AuthType;
    generationConfig?: Partial<ContentGeneratorConfig>;
    /**
     * Optional source map for generationConfig fields (e.g. CLI/env/settings attribution).
     * This is used to produce per-field source badges in the UI.
     */
    generationConfigSources?: ContentGeneratorConfigSources;
    cliVersion?: string;
    loadMemoryFromIncludeDirectories?: boolean;
    importFormat?: 'tree' | 'flat';
    chatRecording?: boolean;
    webSearch?: {
        provider: Array<{
            type: 'tavily' | 'google' | 'dashscope';
            apiKey?: string;
            searchEngineId?: string;
        }>;
        default: string;
    };
    chatCompression?: ChatCompressionSettings;
    interactive?: boolean;
    trustedFolder?: boolean;
    defaultFileEncoding?: FileEncodingType;
    useRipgrep?: boolean;
    useBuiltinRipgrep?: boolean;
    shouldUseNodePtyShell?: boolean;
    skipNextSpeakerCheck?: boolean;
    shellExecutionConfig?: ShellExecutionConfig;
    skipLoopDetection?: boolean;
    truncateToolOutputThreshold?: number;
    truncateToolOutputLines?: number;
    eventEmitter?: EventEmitter;
    output?: OutputSettings;
    inputFormat?: InputFormat;
    outputFormat?: OutputFormat;
    skipStartupContext?: boolean;
    sdkMode?: boolean;
    sessionSubagents?: SubagentConfig[];
    channel?: string;
    /** Model providers configuration grouped by authType */
    modelProvidersConfig?: ModelProvidersConfig;
    /** Multi-agent collaboration settings (Arena, Team, Swarm) */
    agents?: AgentsCollabSettings;
    /**
     * Disable all hooks (default: false, hooks enabled).
     * Migration note: This replaces the deprecated hooksConfig.enabled setting.
     * Users with old settings.json containing hooksConfig.enabled should migrate
     * to use disableAllHooks instead (note: inverted logic - enabled:true → disableAllHooks:false).
     */
    disableAllHooks?: boolean;
    /** Hooks configuration from settings */
    hooks?: Record<string, unknown>;
    /** Warnings generated during configuration resolution */
    warnings?: string[];
    /**
     * Callback for persisting a permission rule to settings.
     * Injected by the CLI layer; core uses this to write allow/ask/deny rules
     * to project or user settings when the user clicks "Always Allow".
     *
     * @param scope - 'project' for workspace settings, 'user' for user settings.
     * @param ruleType - 'allow' | 'ask' | 'deny'.
     * @param rule - The raw rule string, e.g. "Bash(git *)" or "Edit".
     */
    onPersistPermissionRule?: (scope: 'project' | 'user', ruleType: 'allow' | 'ask' | 'deny', rule: string) => Promise<void>;
}
/**
 * Options for Config.initialize()
 */
export interface ConfigInitializeOptions {
    /**
     * Callback for sending MCP messages to SDK servers via control plane.
     * Required for SDK MCP server support in SDK mode.
     */
    sendSdkMcpMessage?: SendSdkMcpMessage;
}
export declare class Config {
    private sessionId;
    private sessionData?;
    private debugLogger;
    private toolRegistry;
    private promptRegistry;
    private subagentManager;
    private extensionManager;
    private skillManager;
    private permissionManager;
    private fileSystemService;
    private contentGeneratorConfig;
    private contentGeneratorConfigSources;
    private contentGenerator;
    private readonly embeddingModel;
    private modelsConfig;
    private readonly modelProvidersConfig?;
    private readonly sandbox;
    private readonly targetDir;
    private workspaceContext;
    private readonly debugMode;
    private readonly inputFormat;
    private readonly outputFormat;
    private readonly includePartialMessages;
    private readonly question;
    private readonly systemPrompt;
    private readonly appendSystemPrompt;
    private readonly coreTools;
    private readonly allowedTools;
    private readonly excludeTools;
    private readonly permissionsAllow;
    private readonly permissionsAsk;
    private readonly permissionsDeny;
    private readonly toolDiscoveryCommand;
    private readonly toolCallCommand;
    private readonly mcpServerCommand;
    private mcpServers;
    private readonly lspEnabled;
    private lspClient?;
    private readonly allowedMcpServers?;
    private excludedMcpServers?;
    private sessionSubagents;
    private userMemory;
    private sdkMode;
    private geminiMdFileCount;
    private approvalMode;
    private readonly accessibility;
    private readonly telemetrySettings;
    private readonly gitCoAuthor;
    private readonly usageStatisticsEnabled;
    private geminiClient;
    private baseLlmClient;
    private cronScheduler;
    private readonly fileFiltering;
    private fileDiscoveryService;
    private gitService;
    private sessionService;
    private chatRecordingService;
    private readonly checkpointing;
    private readonly proxy;
    private readonly cwd;
    private readonly bugCommand;
    private readonly outputLanguageFilePath?;
    private readonly noBrowser;
    private readonly folderTrustFeature;
    private readonly folderTrust;
    private ideMode;
    private readonly maxSessionTurns;
    private readonly sessionTokenLimit;
    private readonly listExtensions;
    private readonly overrideExtensions?;
    private readonly cliVersion?;
    private readonly experimentalZedIntegration;
    private readonly cronEnabled;
    private readonly chatRecordingEnabled;
    private readonly loadMemoryFromIncludeDirectories;
    private readonly importFormat;
    private readonly webSearch?;
    private readonly chatCompression;
    private readonly interactive;
    private readonly trustedFolder;
    private readonly useRipgrep;
    private readonly useBuiltinRipgrep;
    private readonly shouldUseNodePtyShell;
    private readonly skipNextSpeakerCheck;
    private shellExecutionConfig;
    private arenaManager;
    private arenaManagerChangeCallback;
    private readonly arenaAgentClient;
    private readonly agentsSettings;
    private readonly skipLoopDetection;
    private readonly skipStartupContext;
    private readonly warnings;
    private readonly onPersistPermissionRuleCallback?;
    private initialized;
    readonly storage: Storage;
    private readonly fileExclusions;
    private readonly truncateToolOutputThreshold;
    private readonly truncateToolOutputLines;
    private readonly eventEmitter?;
    private readonly channel;
    private readonly defaultFileEncoding;
    private readonly disableAllHooks;
    private readonly hooks?;
    private hookSystem?;
    private messageBus?;
    constructor(params: ConfigParameters);
    /**
     * Must only be called once, throws if called again.
     * @param options Optional initialization options including sendSdkMcpMessage callback
     */
    initialize(options?: ConfigInitializeOptions): Promise<void>;
    refreshHierarchicalMemory(): Promise<void>;
    getContentGenerator(): ContentGenerator;
    /**
     * Get the ModelsConfig instance for model-related operations.
     * External code (e.g., CLI) can use this to access model configuration.
     */
    getModelsConfig(): ModelsConfig;
    /**
     * Updates the credentials in the generation config.
     * Exclusive for `OpenAIKeyPrompt` to update credentials via `/auth`
     * Delegates to ModelsConfig.
     */
    updateCredentials(credentials: {
        apiKey?: string;
        baseUrl?: string;
        model?: string;
    }, settingsGenerationConfig?: Partial<ContentGeneratorConfig>): void;
    /**
     * Reload model providers configuration at runtime.
     * This enables hot-reloading of modelProviders settings without restarting the CLI.
     * Should be called before refreshAuth when settings.json has been updated.
     *
     * @param modelProvidersConfig - The updated model providers configuration
     */
    reloadModelProvidersConfig(modelProvidersConfig?: ModelProvidersConfig): void;
    /**
     * Refresh authentication and rebuild ContentGenerator.
     */
    refreshAuth(authMethod: AuthType, isInitialAuth?: boolean): Promise<void>;
    /**
     * Provides access to the BaseLlmClient for stateless LLM operations.
     */
    getBaseLlmClient(): BaseLlmClient;
    getSessionId(): string;
    /**
     * Returns warnings generated during configuration resolution.
     * These warnings are collected from model configuration resolution
     * and should be displayed to the user during startup.
     */
    getWarnings(): string[];
    getDebugLogger(): DebugLogger;
    /**
     * Starts a new session and resets session-scoped services.
     */
    startNewSession(sessionId?: string, sessionData?: ResumedSessionData): string;
    /**
     * Returns the resumed session data if this session was resumed from a previous one.
     */
    getResumedSessionData(): ResumedSessionData | undefined;
    shouldLoadMemoryFromIncludeDirectories(): boolean;
    getImportFormat(): 'tree' | 'flat';
    getContentGeneratorConfig(): ContentGeneratorConfig;
    getContentGeneratorConfigSources(): ContentGeneratorConfigSources;
    getModel(): string;
    /**
     * Set model programmatically (e.g., VLM auto-switch, fallback).
     * Delegates to ModelsConfig.
     */
    setModel(newModel: string, metadata?: {
        reason?: string;
        context?: string;
    }): Promise<void>;
    /**
     * Handle model change from ModelsConfig.
     * This updates the content generator config with the new model settings.
     */
    private handleModelChange;
    /**
     * Get available models for the current authType.
     * Delegates to ModelsConfig.
     */
    getAvailableModels(): AvailableModel[];
    /**
     * Get available models for a specific authType.
     * Delegates to ModelsConfig.
     */
    getAvailableModelsForAuthType(authType: AuthType): AvailableModel[];
    /**
     * Get all configured models across authTypes.
     * Delegates to ModelsConfig.
     */
    getAllConfiguredModels(authTypes?: AuthType[]): AvailableModel[];
    /**
     * Get the currently active runtime model snapshot.
     * Delegates to ModelsConfig.
     */
    getActiveRuntimeModelSnapshot(): RuntimeModelSnapshot | undefined;
    /**
     * Switch authType+model.
     * Supports both registry-backed models and runtime model snapshots.
     *
     * For runtime models, the modelId should be in format `$runtime|${authType}|${modelId}`.
     * This triggers a refresh of the ContentGenerator when required (always on authType changes).
     * For aether-oauth model switches that are hot-update safe, this may update in place.
     *
     * @param authType - Target authentication type
     * @param modelId - Target model ID (or `$runtime|${authType}|${modelId}` for runtime models)
     * @param options - Additional options like requireCachedCredentials
     */
    switchModel(authType: AuthType, modelId: string, options?: {
        requireCachedCredentials?: boolean;
    }): Promise<void>;
    getMaxSessionTurns(): number;
    getSessionTokenLimit(): number;
    getEmbeddingModel(): string;
    getSandbox(): SandboxConfig | undefined;
    isRestrictiveSandbox(): boolean;
    getTargetDir(): string;
    getProjectRoot(): string;
    getCwd(): string;
    getWorkspaceContext(): WorkspaceContext;
    getToolRegistry(): ToolRegistry;
    /**
     * Shuts down the Config and releases all resources.
     * This method is idempotent and safe to call multiple times.
     * It handles the case where initialization was not completed.
     */
    shutdown(): Promise<void>;
    getPromptRegistry(): PromptRegistry;
    getDebugMode(): boolean;
    getQuestion(): string | undefined;
    getSystemPrompt(): string | undefined;
    getAppendSystemPrompt(): string | undefined;
    /** @deprecated Use getPermissionsAllow() instead. */
    getCoreTools(): string[] | undefined;
    /**
     * Returns the merged allow-rules for PermissionManager.
     *
     * This merges all sources so that PermissionManager receives a single,
     * authoritative list:
     *   - settings.permissions.allow  (persistent rules from all scopes)
     *   - allowedTools param  (SDK / argv auto-approve list)
     *
     * Note: coreTools is intentionally excluded here — it has whitelist semantics
     * (only listed tools are registered), not auto-approve semantics. It is
     * handled separately via PermissionManager.coreToolsAllowList.
     *
     * CLI callers (loadCliConfig) already pre-merge argv into permissionsAllow
     * before constructing Config, so those fields will be empty for CLI usage.
     * SDK callers construct Config directly and rely on allowedTools.
     */
    getPermissionsAllow(): string[];
    getPermissionsAsk(): string[];
    /**
     * Returns the merged deny-rules for PermissionManager.
     *
     * Merges:
     *   - settings.permissions.deny  (persistent rules from all scopes)
     *   - excludeTools param  (SDK / argv blocklist)
     *
     * CLI callers pre-merge argv.excludeTools into permissionsDeny.
     */
    getPermissionsDeny(): string[];
    getToolDiscoveryCommand(): string | undefined;
    getToolCallCommand(): string | undefined;
    getMcpServerCommand(): string | undefined;
    getMcpServers(): Record<string, MCPServerConfig> | undefined;
    getExcludedMcpServers(): string[] | undefined;
    setExcludedMcpServers(excluded: string[]): void;
    isMcpServerDisabled(serverName: string): boolean;
    addMcpServers(servers: Record<string, MCPServerConfig>): void;
    isLspEnabled(): boolean;
    getLspClient(): LspClient | undefined;
    /**
     * Allows wiring an LSP client after Config construction but before initialize().
     */
    setLspClient(client: LspClient | undefined): void;
    getSessionSubagents(): SubagentConfig[];
    setSessionSubagents(subagents: SubagentConfig[]): void;
    getSdkMode(): boolean;
    setSdkMode(value: boolean): void;
    getUserMemory(): string;
    setUserMemory(newUserMemory: string): void;
    getGeminiMdFileCount(): number;
    setGeminiMdFileCount(count: number): void;
    getArenaManager(): ArenaManager | null;
    setArenaManager(manager: ArenaManager | null): void;
    /**
     * Register a callback invoked whenever the arena manager changes.
     * Pass `null` to unsubscribe. Only one subscriber is supported.
     */
    onArenaManagerChange(cb: ((manager: ArenaManager | null) => void) | null): void;
    getArenaAgentClient(): ArenaAgentClient | null;
    getAgentsSettings(): AgentsCollabSettings;
    /**
     * Clean up Arena runtime. When `force` is true (e.g., /arena select --discard),
     * always removes worktrees regardless of preserveArtifacts.
     */
    cleanupArenaRuntime(force?: boolean): Promise<void>;
    getApprovalMode(): ApprovalMode;
    setApprovalMode(mode: ApprovalMode): void;
    getInputFormat(): 'text' | 'stream-json';
    getIncludePartialMessages(): boolean;
    getAccessibility(): AccessibilitySettings;
    getTelemetryEnabled(): boolean;
    getTelemetryLogPromptsEnabled(): boolean;
    getTelemetryOtlpEndpoint(): string;
    getTelemetryOtlpProtocol(): 'grpc' | 'http';
    getTelemetryTarget(): TelemetryTarget;
    getTelemetryOutfile(): string | undefined;
    getGitCoAuthor(): GitCoAuthorSettings;
    getTelemetryUseCollector(): boolean;
    getGeminiClient(): GeminiClient;
    getCronScheduler(): CronScheduler;
    isCronEnabled(): boolean;
    getEnableRecursiveFileSearch(): boolean;
    getFileFilteringEnableFuzzySearch(): boolean;
    getFileFilteringRespectGitIgnore(): boolean;
    getFileFilteringRespectAetherIgnore(): boolean;
    getFileFilteringOptions(): FileFilteringOptions;
    /**
     * Gets custom file exclusion patterns from configuration.
     * TODO: This is a placeholder implementation. In the future, this could
     * read from settings files, CLI arguments, or environment variables.
     */
    getCustomExcludes(): string[];
    getCheckpointingEnabled(): boolean;
    getProxy(): string | undefined;
    getWorkingDir(): string;
    getBugCommand(): BugCommandSettings | undefined;
    getFileService(): FileDiscoveryService;
    getUsageStatisticsEnabled(): boolean;
    getExtensionContextFilePaths(): string[];
    getExperimentalZedIntegration(): boolean;
    getListExtensions(): boolean;
    getExtensionManager(): ExtensionManager;
    /**
     * Get the hook system instance if hooks are enabled.
     * Returns undefined if hooks are not enabled.
     */
    getHookSystem(): HookSystem | undefined;
    /**
     * Fast-path check: returns true only when hooks are enabled AND there are
     * registered hooks for the given event name.  Callers can use this to skip
     * expensive MessageBus round-trips when no hooks are configured.
     */
    hasHooksForEvent(eventName: string): boolean;
    /**
     * Check if all hooks are disabled.
     */
    getDisableAllHooks(): boolean;
    /**
     * Get the message bus instance.
     * Returns undefined if not set.
     */
    getMessageBus(): MessageBus | undefined;
    /**
     * Set the message bus instance.
     * This is called by the CLI layer to inject the MessageBus.
     */
    setMessageBus(messageBus: MessageBus): void;
    /**
     * Get project-level hooks configuration.
     * This is used by the HookRegistry to load project-specific hooks.
     */
    getProjectHooks(): Record<string, unknown> | undefined;
    /**
     * Get all hooks configuration (merged from all sources).
     * This is used by the HookRegistry to load hooks.
     */
    getHooks(): Record<string, unknown> | undefined;
    getExtensions(): Extension[];
    getActiveExtensions(): Extension[];
    getBlockedMcpServers(): Array<{
        name: string;
        extensionName: string;
    }>;
    getNoBrowser(): boolean;
    isBrowserLaunchSuppressed(): boolean;
    getWebSearchConfig(): {
        provider: Array<{
            type: "tavily" | "google" | "dashscope";
            apiKey?: string;
            searchEngineId?: string;
        }>;
        default: string;
    } | undefined;
    getIdeMode(): boolean;
    getFolderTrustFeature(): boolean;
    /**
     * Returns 'true' if the workspace is considered "trusted".
     * 'false' for untrusted.
     */
    getFolderTrust(): boolean;
    isTrustedFolder(): boolean;
    setIdeMode(value: boolean): void;
    getAuthType(): AuthType | undefined;
    getCliVersion(): string | undefined;
    getChannel(): string | undefined;
    /**
     * Get the default file encoding for new files.
     * @returns FileEncodingType
     */
    getDefaultFileEncoding(): FileEncodingType | undefined;
    /**
     * Get the current FileSystemService
     */
    getFileSystemService(): FileSystemService;
    /**
     * Set a custom FileSystemService
     */
    setFileSystemService(fileSystemService: FileSystemService): void;
    getChatCompression(): ChatCompressionSettings | undefined;
    isInteractive(): boolean;
    getUseRipgrep(): boolean;
    getUseBuiltinRipgrep(): boolean;
    getShouldUseNodePtyShell(): boolean;
    getSkipNextSpeakerCheck(): boolean;
    getShellExecutionConfig(): ShellExecutionConfig;
    setShellExecutionConfig(config: ShellExecutionConfig): void;
    getScreenReader(): boolean;
    getSkipLoopDetection(): boolean;
    getSkipStartupContext(): boolean;
    getTruncateToolOutputThreshold(): number;
    getTruncateToolOutputLines(): number;
    getOutputFormat(): OutputFormat;
    getGitService(): Promise<GitService>;
    /**
     * Returns the chat recording service.
     */
    getChatRecordingService(): ChatRecordingService | undefined;
    /**
     * Returns the transcript file path for the current session.
     * This is the path to the JSONL file where the conversation is recorded.
     * Returns empty string if chat recording is disabled.
     */
    getTranscriptPath(): string;
    /**
     * Gets or creates a SessionService for managing chat sessions.
     */
    getSessionService(): SessionService;
    getFileExclusions(): FileExclusions;
    getSubagentManager(): SubagentManager;
    getSkillManager(): SkillManager | null;
    getPermissionManager(): PermissionManager | null;
    /**
     * Returns the callback for persisting permission rules to settings files.
     * Returns undefined if no callback was provided (e.g. SDK mode).
     */
    getOnPersistPermissionRule(): ((scope: 'project' | 'user', ruleType: 'allow' | 'ask' | 'deny', rule: string) => Promise<void>) | undefined;
    createToolRegistry(sendSdkMcpMessage?: SendSdkMcpMessage, options?: {
        skipDiscovery?: boolean;
    }): Promise<ToolRegistry>;
}
