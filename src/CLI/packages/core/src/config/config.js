/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import process from 'node:process';
// External dependencies
import { ProxyAgent, setGlobalDispatcher } from 'undici';
import { ArenaAgentClient } from '../agents/arena/ArenaAgentClient.js';
import { MessageBus } from '../confirmation-bus/message-bus.js';
import { MessageBusType } from '../confirmation-bus/types.js';
// Core
import { BaseLlmClient } from '../core/baseLlmClient.js';
import { GeminiClient } from '../core/client.js';
import { AuthType, createContentGenerator, resolveContentGeneratorConfigWithSources } from '../core/contentGenerator.js';
import { fireNotificationHook } from '../core/toolHookTriggers.js';
import { ExtensionManager } from '../extension/extensionManager.js';
import { createHookOutput, HookSystem } from '../hooks/index.js';
import { NotificationType, PermissionMode } from '../hooks/types.js';
// Other modules
import { ideContextStore } from '../ide/ideContext.js';
import { ModelsConfig } from '../models/index.js';
import { InputFormat, OutputFormat } from '../output/types.js';
import { PermissionManager } from '../permissions/permission-manager.js';
import { PromptRegistry } from '../prompts/prompt-registry.js';
import { ChatRecordingService } from '../services/chatRecordingService.js';
import { CronScheduler } from '../services/cronScheduler.js';
// Services
import { FileDiscoveryService } from '../services/fileDiscoveryService.js';
import { StandardFileSystemService } from '../services/fileSystemService.js';
import { GitService } from '../services/gitService.js';
import { SessionService } from '../services/sessionService.js';
import { SkillManager } from '../skills/skill-manager.js';
import { SubagentManager } from '../subagents/subagent-manager.js';
import { DEFAULT_OTLP_ENDPOINT, DEFAULT_TELEMETRY_TARGET, initializeTelemetry, logRipgrepFallback, logStartSession, RipgrepFallbackEvent, StartSessionEvent } from '../telemetry/index.js';
import { AgentTool } from '../tools/agent.js';
// Tools
import { AskUserQuestionTool } from '../tools/askUserQuestion.js';
import { CronCreateTool } from '../tools/cron-create.js';
import { CronDeleteTool } from '../tools/cron-delete.js';
import { CronListTool } from '../tools/cron-list.js';
import { EditTool } from '../tools/edit.js';
import { ExitPlanModeTool } from '../tools/exitPlanMode.js';
import { GlobTool } from '../tools/glob.js';
import { GrepTool } from '../tools/grep.js';
import { LSTool } from '../tools/ls.js';
import { LspTool } from '../tools/lsp.js';
import { MemoryTool, setGeminiMdFilename } from '../tools/memoryTool.js';
import { ReadFileTool } from '../tools/read-file.js';
import { RipGrepTool } from '../tools/ripGrep.js';
import { ShellTool } from '../tools/shell.js';
import { SkillTool } from '../tools/skill.js';
import { TodoWriteTool } from '../tools/todoWrite.js';
import { ToolRegistry } from '../tools/tool-registry.js';
import { WebFetchTool } from '../tools/web-fetch.js';
import { WebSearchTool } from '../tools/web-search/index.js';
import { WriteFileTool } from '../tools/write-file.js';
// Utils
import { shouldAttemptBrowserLaunch } from '../utils/browser.js';
import { createDebugLogger, setDebugLogSession } from '../utils/debugLogger.js';
import { getErrorMessage } from '../utils/errors.js';
import { FileExclusions } from '../utils/ignorePatterns.js';
import { loadServerHierarchicalMemory } from '../utils/memoryDiscovery.js';
import { normalizeProxyUrl } from '../utils/proxyUtils.js';
import { canUseRipgrep } from '../utils/ripgrepUtils.js';
import { shouldDefaultToNodePty } from '../utils/shell-utils.js';
import { WorkspaceContext } from '../utils/workspaceContext.js';
import { DEFAULT_FILE_FILTERING_OPTIONS, DEFAULT_MEMORY_FILE_FILTERING_OPTIONS } from './constants.js';
import { DEFAULT_AETHER_EMBEDDING_MODEL } from './models.js';
import { Storage } from './storage.js';
export { DEFAULT_FILE_FILTERING_OPTIONS, DEFAULT_MEMORY_FILE_FILTERING_OPTIONS };
export var ApprovalMode;
(function (ApprovalMode) {
    ApprovalMode["PLAN"] = "plan";
    ApprovalMode["DEFAULT"] = "default";
    ApprovalMode["AUTO_EDIT"] = "auto-edit";
    ApprovalMode["YOLO"] = "yolo";
})(ApprovalMode || (ApprovalMode = {}));
export const APPROVAL_MODES = Object.values(ApprovalMode);
/**
 * Detailed information about each approval mode.
 * Used for UI display and protocol responses.
 */
export const APPROVAL_MODE_INFO = {
    [ApprovalMode.PLAN]: {
        id: ApprovalMode.PLAN,
        name: 'Plan',
        description: 'Analyze only, do not modify files or execute commands'
    },
    [ApprovalMode.DEFAULT]: {
        id: ApprovalMode.DEFAULT,
        name: 'Default',
        description: 'Require approval for file edits or shell commands'
    },
    [ApprovalMode.AUTO_EDIT]: {
        id: ApprovalMode.AUTO_EDIT,
        name: 'Auto Edit',
        description: 'Automatically approve file edits'
    },
    [ApprovalMode.YOLO]: {
        id: ApprovalMode.YOLO,
        name: 'YOLO',
        description: 'Automatically approve all tools'
    }
};
export const DEFAULT_TRUNCATE_TOOL_OUTPUT_THRESHOLD = 25_000;
export const DEFAULT_TRUNCATE_TOOL_OUTPUT_LINES = 1000;
export class MCPServerConfig {
    command;
    args;
    env;
    cwd;
    url;
    httpUrl;
    headers;
    tcp;
    timeout;
    trust;
    description;
    includeTools;
    excludeTools;
    extensionName;
    oauth;
    authProviderType;
    targetAudience;
    targetServiceAccount;
    type;
    constructor(
    // For stdio transport
    command, args, env, cwd, 
    // For sse transport
    url, 
    // For streamable http transport
    httpUrl, headers, 
    // For websocket transport
    tcp, 
    // Common
    timeout, trust, 
    // Metadata
    description, includeTools, excludeTools, extensionName, 
    // OAuth configuration
    oauth, authProviderType, 
    // Service Account Configuration
    /* targetAudience format: CLIENT_ID.apps.googleusercontent.com */
    targetAudience, 
    /* targetServiceAccount format: <service-account-name>@<project-num>.iam.gserviceaccount.com */
    targetServiceAccount, 
    // SDK MCP server type - 'sdk' indicates server runs in SDK process
    type) {
        this.command = command;
        this.args = args;
        this.env = env;
        this.cwd = cwd;
        this.url = url;
        this.httpUrl = httpUrl;
        this.headers = headers;
        this.tcp = tcp;
        this.timeout = timeout;
        this.trust = trust;
        this.description = description;
        this.includeTools = includeTools;
        this.excludeTools = excludeTools;
        this.extensionName = extensionName;
        this.oauth = oauth;
        this.authProviderType = authProviderType;
        this.targetAudience = targetAudience;
        this.targetServiceAccount = targetServiceAccount;
        this.type = type;
    }
}
/**
 * Check if an MCP server config represents an SDK server
 */
export function isSdkMcpServerConfig(config) {
    return config.type === 'sdk';
}
export var AuthProviderType;
(function (AuthProviderType) {
    AuthProviderType["DYNAMIC_DISCOVERY"] = "dynamic_discovery";
    AuthProviderType["GOOGLE_CREDENTIALS"] = "google_credentials";
    AuthProviderType["SERVICE_ACCOUNT_IMPERSONATION"] = "service_account_impersonation";
})(AuthProviderType || (AuthProviderType = {}));
function normalizeConfigOutputFormat(format) {
    if (!format) {
        return undefined;
    }
    switch (format) {
        case 'stream-json':
            return OutputFormat.STREAM_JSON;
        case 'json':
        case OutputFormat.JSON:
            return OutputFormat.JSON;
        default:
            return OutputFormat.TEXT;
    }
}
export class Config {
    sessionId;
    sessionData;
    debugLogger;
    toolRegistry;
    promptRegistry;
    subagentManager;
    extensionManager;
    skillManager = null;
    permissionManager = null;
    fileSystemService;
    contentGeneratorConfig;
    contentGeneratorConfigSources = {};
    contentGenerator;
    embeddingModel;
    modelsConfig;
    modelProvidersConfig;
    sandbox;
    targetDir;
    workspaceContext;
    debugMode;
    inputFormat;
    outputFormat;
    includePartialMessages;
    question;
    systemPrompt;
    appendSystemPrompt;
    coreTools;
    allowedTools;
    excludeTools;
    permissionsAllow;
    permissionsAsk;
    permissionsDeny;
    toolDiscoveryCommand;
    toolCallCommand;
    mcpServerCommand;
    mcpServers;
    lspEnabled;
    lspClient;
    allowedMcpServers;
    excludedMcpServers;
    sessionSubagents;
    userMemory;
    sdkMode;
    geminiMdFileCount;
    approvalMode;
    accessibility;
    telemetrySettings;
    gitCoAuthor;
    usageStatisticsEnabled;
    geminiClient;
    baseLlmClient;
    cronScheduler = null;
    fileFiltering;
    fileDiscoveryService = null;
    gitService = undefined;
    sessionService = undefined;
    chatRecordingService = undefined;
    checkpointing;
    proxy;
    cwd;
    bugCommand;
    outputLanguageFilePath;
    noBrowser;
    folderTrustFeature;
    folderTrust;
    ideMode;
    maxSessionTurns;
    sessionTokenLimit;
    listExtensions;
    overrideExtensions;
    cliVersion;
    experimentalZedIntegration = false;
    cronEnabled = false;
    chatRecordingEnabled;
    loadMemoryFromIncludeDirectories = false;
    importFormat;
    webSearch;
    chatCompression;
    interactive;
    trustedFolder;
    useRipgrep;
    useBuiltinRipgrep;
    shouldUseNodePtyShell;
    skipNextSpeakerCheck;
    shellExecutionConfig;
    arenaManager = null;
    arenaManagerChangeCallback = null;
    arenaAgentClient;
    agentsSettings;
    skipLoopDetection;
    skipStartupContext;
    warnings;
    onPersistPermissionRuleCallback;
    initialized = false;
    storage;
    fileExclusions;
    truncateToolOutputThreshold;
    truncateToolOutputLines;
    eventEmitter;
    channel;
    defaultFileEncoding;
    disableAllHooks;
    hooks;
    hookSystem;
    messageBus;
    constructor(params) {
        this.sessionId = params.sessionId ?? randomUUID();
        this.sessionData = params.sessionData;
        setDebugLogSession(this);
        this.debugLogger = createDebugLogger();
        this.embeddingModel =
            params.embeddingModel ?? DEFAULT_AETHER_EMBEDDING_MODEL;
        this.fileSystemService = new StandardFileSystemService();
        this.sandbox = params.sandbox;
        this.targetDir = path.resolve(params.targetDir);
        this.workspaceContext = new WorkspaceContext(this.targetDir, params.includeDirectories ?? []);
        this.debugMode = params.debugMode;
        this.inputFormat = params.inputFormat ?? InputFormat.TEXT;
        const normalizedOutputFormat = normalizeConfigOutputFormat(params.outputFormat ?? params.output?.format);
        this.outputFormat = normalizedOutputFormat ?? OutputFormat.TEXT;
        this.includePartialMessages = params.includePartialMessages ?? false;
        this.question = params.question;
        this.systemPrompt = params.systemPrompt;
        this.appendSystemPrompt = params.appendSystemPrompt;
        this.coreTools = params.coreTools;
        this.allowedTools = params.allowedTools;
        this.excludeTools = params.excludeTools;
        this.permissionsAllow = params.permissions?.allow || [];
        this.permissionsAsk = params.permissions?.ask || [];
        this.permissionsDeny = params.permissions?.deny || [];
        this.toolDiscoveryCommand = params.toolDiscoveryCommand;
        this.toolCallCommand = params.toolCallCommand;
        this.mcpServerCommand = params.mcpServerCommand;
        this.mcpServers = params.mcpServers;
        this.lspEnabled = params.lsp?.enabled ?? false;
        this.lspClient = params.lspClient;
        this.allowedMcpServers = params.allowedMcpServers;
        this.excludedMcpServers = params.excludedMcpServers;
        this.sessionSubagents = params.sessionSubagents ?? [];
        this.sdkMode = params.sdkMode ?? false;
        this.userMemory = params.userMemory ?? '';
        this.geminiMdFileCount = params.geminiMdFileCount ?? 0;
        this.approvalMode = params.approvalMode ?? ApprovalMode.DEFAULT;
        this.accessibility = params.accessibility ?? {};
        this.telemetrySettings = {
            enabled: params.telemetry?.enabled ?? false,
            target: params.telemetry?.target ?? DEFAULT_TELEMETRY_TARGET,
            otlpEndpoint: params.telemetry?.otlpEndpoint ?? DEFAULT_OTLP_ENDPOINT,
            otlpProtocol: params.telemetry?.otlpProtocol,
            logPrompts: params.telemetry?.logPrompts ?? true,
            outfile: params.telemetry?.outfile,
            useCollector: params.telemetry?.useCollector
        };
        this.gitCoAuthor = {
            enabled: params.gitCoAuthor ?? true,
            name: 'Aether-Coder',
            email: 'aether-clir@alibabacloud.com'
        };
        this.usageStatisticsEnabled = params.usageStatisticsEnabled ?? true;
        this.outputLanguageFilePath = params.outputLanguageFilePath;
        this.fileFiltering = {
            respectGitIgnore: params.fileFiltering?.respectGitIgnore ?? true,
            respectAetherIgnore: params.fileFiltering?.respectAetherIgnore ?? true,
            respectQwenIgnore: params.fileFiltering?.respectQwenIgnore ?? true,
            enableRecursiveFileSearch: params.fileFiltering?.enableRecursiveFileSearch ?? true,
            enableFuzzySearch: params.fileFiltering?.enableFuzzySearch ?? true
        };
        this.checkpointing = params.checkpointing ?? false;
        this.proxy = params.proxy;
        this.cwd = params.cwd ?? process.cwd();
        this.fileDiscoveryService = params.fileDiscoveryService ?? null;
        this.bugCommand = params.bugCommand;
        this.maxSessionTurns = params.maxSessionTurns ?? -1;
        this.sessionTokenLimit = params.sessionTokenLimit ?? -1;
        this.experimentalZedIntegration =
            params.experimentalZedIntegration ?? false;
        this.cronEnabled = params.cronEnabled ?? false;
        this.listExtensions = params.listExtensions ?? false;
        this.overrideExtensions = params.overrideExtensions;
        this.noBrowser = params.noBrowser ?? false;
        this.folderTrustFeature = params.folderTrustFeature ?? false;
        this.folderTrust = params.folderTrust ?? false;
        this.ideMode = params.ideMode ?? false;
        this.modelProvidersConfig = params.modelProvidersConfig;
        this.cliVersion = params.cliVersion;
        this.chatRecordingEnabled = params.chatRecording ?? true;
        this.loadMemoryFromIncludeDirectories =
            params.loadMemoryFromIncludeDirectories ?? false;
        this.importFormat = params.importFormat ?? 'tree';
        this.chatCompression = params.chatCompression;
        this.interactive = params.interactive ?? false;
        this.trustedFolder = params.trustedFolder;
        this.skipLoopDetection = params.skipLoopDetection ?? false;
        this.skipStartupContext = params.skipStartupContext ?? false;
        this.warnings = params.warnings ?? [];
        this.onPersistPermissionRuleCallback = params.onPersistPermissionRule;
        // Web search
        this.webSearch = params.webSearch;
        this.useRipgrep = params.useRipgrep ?? true;
        this.useBuiltinRipgrep = params.useBuiltinRipgrep ?? true;
        this.shouldUseNodePtyShell =
            params.shouldUseNodePtyShell ?? shouldDefaultToNodePty();
        this.skipNextSpeakerCheck = params.skipNextSpeakerCheck ?? true;
        this.shellExecutionConfig = {
            terminalWidth: params.shellExecutionConfig?.terminalWidth ?? 80,
            terminalHeight: params.shellExecutionConfig?.terminalHeight ?? 24,
            showColor: params.shellExecutionConfig?.showColor ?? false,
            pager: params.shellExecutionConfig?.pager ?? 'cat'
        };
        this.truncateToolOutputThreshold =
            params.truncateToolOutputThreshold ??
                DEFAULT_TRUNCATE_TOOL_OUTPUT_THRESHOLD;
        this.truncateToolOutputLines =
            params.truncateToolOutputLines ??
                DEFAULT_TRUNCATE_TOOL_OUTPUT_LINES;
        this.channel = params.channel;
        this.defaultFileEncoding = params.defaultFileEncoding;
        this.storage = new Storage(this.targetDir);
        this.inputFormat = params.inputFormat ?? InputFormat.TEXT;
        this.fileExclusions = new FileExclusions(this);
        this.eventEmitter = params.eventEmitter;
        this.arenaAgentClient = ArenaAgentClient.create();
        this.agentsSettings = params.agents ?? {};
        if (params.contextFileName) {
            setGeminiMdFilename(params.contextFileName);
        }
        // Create ModelsConfig for centralized model management
        // Prefer params.authType over generationConfig.authType because:
        // - params.authType preserves undefined (user hasn't selected yet)
        // - generationConfig.authType may have a default value from resolvers
        this.modelsConfig = new ModelsConfig({
            initialAuthType: params.authType ?? params.generationConfig?.authType,
            modelProvidersConfig: this.modelProvidersConfig,
            generationConfig: {
                model: params.model,
                ...(params.generationConfig || {}),
                baseUrl: params.generationConfig?.baseUrl
            },
            generationConfigSources: params.generationConfigSources,
            onModelChange: this.handleModelChange.bind(this)
        });
        if (this.telemetrySettings.enabled) {
            initializeTelemetry(this);
        }
        const proxyUrl = this.getProxy();
        if (proxyUrl) {
            setGlobalDispatcher(new ProxyAgent(proxyUrl));
        }
        this.geminiClient = new GeminiClient(this);
        this.chatRecordingService = this.chatRecordingEnabled
            ? new ChatRecordingService(this)
            : undefined;
        this.extensionManager = new ExtensionManager({
            workspaceDir: this.targetDir,
            enabledExtensionOverrides: this.overrideExtensions,
            isWorkspaceTrusted: this.isTrustedFolder()
        });
        this.disableAllHooks = params.disableAllHooks ?? false;
        this.hooks = params.hooks;
    }
    /**
     * Must only be called once, throws if called again.
     * @param options Optional initialization options including sendSdkMcpMessage callback
     */
    async initialize(options) {
        if (this.initialized) {
            throw Error('Config was already initialized');
        }
        this.initialized = true;
        this.debugLogger.info('Config initialization started');
        // Initialize centralized FileDiscoveryService
        this.getFileService();
        if (this.getCheckpointingEnabled()) {
            await this.getGitService();
        }
        this.promptRegistry = new PromptRegistry();
        this.extensionManager.setConfig(this);
        await this.extensionManager.refreshCache();
        this.debugLogger.debug('Extension manager initialized');
        // Initialize hook system if enabled
        if (!this.disableAllHooks) {
            this.hookSystem = new HookSystem(this);
            await this.hookSystem.initialize();
            this.debugLogger.debug('Hook system initialized');
            // Initialize MessageBus for hook execution
            this.messageBus = new MessageBus();
            // Subscribe to HOOK_EXECUTION_REQUEST to execute hooks
            this.messageBus.subscribe(MessageBusType.HOOK_EXECUTION_REQUEST, async (request) => {
                try {
                    const hookSystem = this.hookSystem;
                    if (!hookSystem) {
                        this.messageBus?.publish({
                            type: MessageBusType.HOOK_EXECUTION_RESPONSE,
                            correlationId: request.correlationId,
                            success: false,
                            error: new Error('Hook system not initialized')
                        });
                        return;
                    }
                    // Check if request was aborted
                    if (request.signal?.aborted) {
                        this.messageBus?.publish({
                            type: MessageBusType.HOOK_EXECUTION_RESPONSE,
                            correlationId: request.correlationId,
                            success: false,
                            error: new Error('Hook execution cancelled (aborted)')
                        });
                        return;
                    }
                    // Execute the appropriate hook based on eventName
                    let result;
                    let stopHookCount;
                    const input = request.input || {};
                    const signal = request.signal;
                    switch (request.eventName) {
                        case 'UserPromptSubmit':
                            result =
                                await hookSystem.fireUserPromptSubmitEvent(input.prompt || '', signal);
                            break;
                        case 'Stop': {
                            const stopResult = await hookSystem.fireStopEvent(input.stop_hook_active ||
                                false, input.last_assistant_message ||
                                '', signal);
                            result = stopResult.finalOutput
                                ? createHookOutput('Stop', stopResult.finalOutput)
                                : undefined;
                            stopHookCount = stopResult.allOutputs.length;
                            break;
                        }
                        case 'PreToolUse': {
                            result = await hookSystem.firePreToolUseEvent(input.tool_name || '', input.tool_input || {}, input.tool_use_id || '', input.permission_mode ?? PermissionMode.Default, signal);
                            break;
                        }
                        case 'PostToolUse':
                            result = await hookSystem.firePostToolUseEvent(input.tool_name || '', input.tool_input || {}, input.tool_response || {}, input.tool_use_id || '', input.permission_mode ||
                                'default', signal);
                            break;
                        case 'PostToolUseFailure':
                            result =
                                await hookSystem.firePostToolUseFailureEvent(input.tool_use_id || '', input.tool_name || '', input.tool_input || {}, input.error || '', input.is_interrupt, input.permission_mode ||
                                    'default', signal);
                            break;
                        case 'Notification':
                            result = await hookSystem.fireNotificationEvent(input.message || '', input.notification_type ||
                                'permission_prompt', input.title || undefined, signal);
                            break;
                        case 'PermissionRequest':
                            result =
                                await hookSystem.firePermissionRequestEvent(input.tool_name || '', input.tool_input || {}, input.permission_mode ||
                                    PermissionMode.Default, input.permission_suggestions || undefined, signal);
                            break;
                        case 'SubagentStart':
                            result =
                                await hookSystem.fireSubagentStartEvent(input.agent_id || '', input.agent_type || '', input.permission_mode ||
                                    PermissionMode.Default, signal);
                            break;
                        case 'SubagentStop':
                            result = await hookSystem.fireSubagentStopEvent(input.agent_id || '', input.agent_type || '', input.agent_transcript_path ||
                                '', input.last_assistant_message ||
                                '', input.stop_hook_active ||
                                false, input.permission_mode ||
                                PermissionMode.Default, signal);
                            break;
                        default:
                            this.debugLogger.warn(`Unknown hook event: ${request.eventName}`);
                            result = undefined;
                    }
                    // Send response
                    this.messageBus?.publish({
                        type: MessageBusType.HOOK_EXECUTION_RESPONSE,
                        correlationId: request.correlationId,
                        success: true,
                        output: result,
                        // Include stop hook count for Stop events
                        stopHookCount
                    });
                }
                catch (error) {
                    this.debugLogger.warn(`Hook execution failed: ${error}`);
                    this.messageBus?.publish({
                        type: MessageBusType.HOOK_EXECUTION_RESPONSE,
                        correlationId: request.correlationId,
                        success: false,
                        error: error instanceof Error
                            ? error
                            : new Error(String(error))
                    });
                }
            });
            this.debugLogger.debug('MessageBus initialized with hook subscription');
        }
        else {
            this.debugLogger.debug('Hook system disabled, skipping initialization');
        }
        this.subagentManager = new SubagentManager(this);
        this.skillManager = new SkillManager(this);
        await this.skillManager.startWatching();
        this.debugLogger.debug('Skill manager initialized');
        this.permissionManager = new PermissionManager(this);
        this.permissionManager.initialize();
        this.debugLogger.debug('Permission manager initialized');
        // Load session subagents if they were provided before initialization
        if (this.sessionSubagents.length > 0) {
            this.subagentManager.loadSessionSubagents(this.sessionSubagents);
        }
        await this.extensionManager.refreshCache();
        await this.refreshHierarchicalMemory();
        this.debugLogger.debug('Hierarchical memory loaded');
        this.toolRegistry = await this.createToolRegistry(options?.sendSdkMcpMessage);
        this.debugLogger.info(`Tool registry initialized with ${this.toolRegistry.getAllToolNames().length} tools`);
        await this.geminiClient.initialize();
        this.debugLogger.info('Gemini client initialized');
        // Detect and capture runtime model snapshot (from CLI/ENV/credentials)
        this.modelsConfig.detectAndCaptureRuntimeModel();
        logStartSession(this, new StartSessionEvent(this));
        this.debugLogger.info('Config initialization completed');
    }
    async refreshHierarchicalMemory() {
        const { memoryContent, fileCount } = await loadServerHierarchicalMemory(this.getWorkingDir(), this.shouldLoadMemoryFromIncludeDirectories()
            ? this.getWorkspaceContext().getDirectories()
            : [], this.getFileService(), this.getExtensionContextFilePaths(), this.isTrustedFolder(), this.getImportFormat());
        this.setUserMemory(memoryContent);
        this.setGeminiMdFileCount(fileCount);
    }
    getContentGenerator() {
        return this.contentGenerator;
    }
    /**
     * Get the ModelsConfig instance for model-related operations.
     * External code (e.g., CLI) can use this to access model configuration.
     */
    getModelsConfig() {
        return this.modelsConfig;
    }
    /**
     * Updates the credentials in the generation config.
     * Exclusive for `OpenAIKeyPrompt` to update credentials via `/auth`
     * Delegates to ModelsConfig.
     */
    updateCredentials(credentials, settingsGenerationConfig) {
        this.modelsConfig.updateCredentials(credentials, settingsGenerationConfig);
    }
    /**
     * Reload model providers configuration at runtime.
     * This enables hot-reloading of modelProviders settings without restarting the CLI.
     * Should be called before refreshAuth when settings.json has been updated.
     *
     * @param modelProvidersConfig - The updated model providers configuration
     */
    reloadModelProvidersConfig(modelProvidersConfig) {
        this.modelsConfig.reloadModelProvidersConfig(modelProvidersConfig);
    }
    /**
     * Refresh authentication and rebuild ContentGenerator.
     */
    async refreshAuth(authMethod, isInitialAuth) {
        await this.modelsConfig.refreshRuntimeModelProviders(true);
        // Sync modelsConfig state for this auth refresh
        const modelId = this.modelsConfig.getModel();
        this.modelsConfig.syncAfterAuthRefresh(authMethod, modelId);
        // Check and consume cached credentials flag
        const requireCached = this.modelsConfig.consumeRequireCachedCredentialsFlag();
        const { config, sources } = resolveContentGeneratorConfigWithSources(this, authMethod, this.modelsConfig.getGenerationConfig(), this.modelsConfig.getGenerationConfigSources(), {
            strictModelProvider: this.modelsConfig.isStrictModelProviderSelection()
        });
        const newContentGeneratorConfig = config;
        this.contentGenerator = await createContentGenerator(newContentGeneratorConfig, this, requireCached ? true : isInitialAuth);
        // Only assign to instance properties after successful initialization
        this.contentGeneratorConfig = newContentGeneratorConfig;
        this.contentGeneratorConfigSources = sources;
        // Initialize BaseLlmClient now that the ContentGenerator is available
        this.baseLlmClient = new BaseLlmClient(this.contentGenerator, this);
        // Fire auth_success notification hook (supports both interactive & non-interactive)
        const messageBus = this.getMessageBus();
        const hooksEnabled = !this.getDisableAllHooks();
        if (hooksEnabled && messageBus) {
            fireNotificationHook(messageBus, `Successfully authenticated with ${authMethod}`, NotificationType.AuthSuccess, 'Authentication successful').catch(() => {
                // Silently ignore errors - fireNotificationHook has internal error handling
                // and notification hooks should not block the auth flow
            });
        }
    }
    /**
     * Provides access to the BaseLlmClient for stateless LLM operations.
     */
    getBaseLlmClient() {
        if (!this.baseLlmClient) {
            // Handle cases where initialization might be deferred or authentication failed
            if (this.contentGenerator) {
                this.baseLlmClient = new BaseLlmClient(this.getContentGenerator(), this);
            }
            else {
                throw new Error('BaseLlmClient not initialized. Ensure authentication has occurred and ContentGenerator is ready.');
            }
        }
        return this.baseLlmClient;
    }
    getSessionId() {
        return this.sessionId;
    }
    /**
     * Returns warnings generated during configuration resolution.
     * These warnings are collected from model configuration resolution
     * and should be displayed to the user during startup.
     */
    getWarnings() {
        return this.warnings;
    }
    getDebugLogger() {
        return this.debugLogger;
    }
    /**
     * Starts a new session and resets session-scoped services.
     */
    startNewSession(sessionId, sessionData) {
        this.sessionId = sessionId ?? randomUUID();
        this.sessionData = sessionData;
        setDebugLogSession(this);
        this.debugLogger = createDebugLogger();
        this.chatRecordingService = this.chatRecordingEnabled
            ? new ChatRecordingService(this)
            : undefined;
        if (this.initialized) {
            logStartSession(this, new StartSessionEvent(this));
        }
        return this.sessionId;
    }
    /**
     * Returns the resumed session data if this session was resumed from a previous one.
     */
    getResumedSessionData() {
        return this.sessionData;
    }
    shouldLoadMemoryFromIncludeDirectories() {
        return this.loadMemoryFromIncludeDirectories;
    }
    getImportFormat() {
        return this.importFormat;
    }
    getContentGeneratorConfig() {
        return this.contentGeneratorConfig;
    }
    getContentGeneratorConfigSources() {
        // If contentGeneratorConfigSources is empty (before initializeAuth),
        // get sources from ModelsConfig
        if (Object.keys(this.contentGeneratorConfigSources).length === 0 &&
            this.modelsConfig) {
            return this.modelsConfig.getGenerationConfigSources();
        }
        return this.contentGeneratorConfigSources;
    }
    getModel() {
        return (this.contentGeneratorConfig?.model || this.modelsConfig.getModel());
    }
    /**
     * Set model programmatically (e.g., VLM auto-switch, fallback).
     * Delegates to ModelsConfig.
     */
    async setModel(newModel, metadata) {
        await this.modelsConfig.setModel(newModel, metadata);
        // Also update contentGeneratorConfig for hot-update compatibility
        if (this.contentGeneratorConfig) {
            this.contentGeneratorConfig.model = newModel;
        }
    }
    /**
     * Handle model change from ModelsConfig.
     * This updates the content generator config with the new model settings.
     */
    async handleModelChange(authType, requiresRefresh) {
        if (!this.contentGeneratorConfig) {
            return;
        }
        // Hot update path: only supported for aether-oauth.
        // For other auth types we always refresh to recreate the ContentGenerator.
        //
        // Rationale:
        // - Non-aether providers may need to re-validate credentials / baseUrl / envKey.
        // - ModelsConfig.applyResolvedModelDefaults can clear or change credentials sources.
        // - Refresh keeps runtime behavior consistent and centralized.
        if (authType === AuthType.AETHER_OAUTH && !requiresRefresh) {
            const { config, sources } = resolveContentGeneratorConfigWithSources(this, authType, this.modelsConfig.getGenerationConfig(), this.modelsConfig.getGenerationConfigSources(), {
                strictModelProvider: this.modelsConfig.isStrictModelProviderSelection()
            });
            // Hot-update fields (aether-oauth models share the same auth + client).
            this.contentGeneratorConfig.model = config.model;
            this.contentGeneratorConfig.samplingParams = config.samplingParams;
            this.contentGeneratorConfig.contextWindowSize =
                config.contextWindowSize;
            this.contentGeneratorConfig.enableCacheControl =
                config.enableCacheControl;
            if ('model' in sources) {
                this.contentGeneratorConfigSources.model = sources.model;
            }
            if ('samplingParams' in sources) {
                this.contentGeneratorConfigSources.samplingParams =
                    sources.samplingParams;
            }
            if ('enableCacheControl' in sources) {
                this.contentGeneratorConfigSources.enableCacheControl =
                    sources.enableCacheControl;
            }
            if ('contextWindowSize' in sources) {
                this.contentGeneratorConfigSources.contextWindowSize =
                    sources.contextWindowSize;
            }
            return;
        }
        // Full refresh path
        await this.refreshAuth(authType);
    }
    /**
     * Get available models for the current authType.
     * Delegates to ModelsConfig.
     */
    getAvailableModels() {
        return this.modelsConfig.getAvailableModels();
    }
    /**
     * Get available models for a specific authType.
     * Delegates to ModelsConfig.
     */
    getAvailableModelsForAuthType(authType) {
        return this.modelsConfig.getAvailableModelsForAuthType(authType);
    }
    /**
     * Get all configured models across authTypes.
     * Delegates to ModelsConfig.
     */
    getAllConfiguredModels(authTypes) {
        return this.modelsConfig.getAllConfiguredModels(authTypes);
    }
    /**
     * Get the currently active runtime model snapshot.
     * Delegates to ModelsConfig.
     */
    getActiveRuntimeModelSnapshot() {
        return this.modelsConfig.getActiveRuntimeModelSnapshot();
    }
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
    async switchModel(authType, modelId, options) {
        await this.modelsConfig.switchModel(authType, modelId, options);
    }
    getMaxSessionTurns() {
        return this.maxSessionTurns;
    }
    getSessionTokenLimit() {
        return this.sessionTokenLimit;
    }
    getEmbeddingModel() {
        return this.embeddingModel;
    }
    getSandbox() {
        return this.sandbox;
    }
    isRestrictiveSandbox() {
        const sandboxConfig = this.getSandbox();
        const seatbeltProfile = process.env.SEATBELT_PROFILE;
        return (!!sandboxConfig &&
            sandboxConfig.command === 'sandbox-exec' &&
            !!seatbeltProfile &&
            seatbeltProfile.startsWith('restrictive-'));
    }
    getTargetDir() {
        return this.targetDir;
    }
    getProjectRoot() {
        return this.targetDir;
    }
    getCwd() {
        return this.targetDir;
    }
    getWorkspaceContext() {
        return this.workspaceContext;
    }
    getToolRegistry() {
        return this.toolRegistry;
    }
    /**
     * Shuts down the Config and releases all resources.
     * This method is idempotent and safe to call multiple times.
     * It handles the case where initialization was not completed.
     */
    async shutdown() {
        if (!this.initialized) {
            // Nothing to clean up if not initialized
            return;
        }
        try {
            this.skillManager?.stopWatching();
            if (this.toolRegistry) {
                await this.toolRegistry.stop();
            }
            await this.cleanupArenaRuntime();
        }
        catch (error) {
            // Log but don't throw - cleanup should be best-effort
            this.debugLogger.error('Error during Config shutdown:', error);
        }
    }
    getPromptRegistry() {
        return this.promptRegistry;
    }
    getDebugMode() {
        return this.debugMode;
    }
    getQuestion() {
        return this.question;
    }
    getSystemPrompt() {
        return this.systemPrompt;
    }
    getAppendSystemPrompt() {
        return this.appendSystemPrompt;
    }
    /** @deprecated Use getPermissionsAllow() instead. */
    getCoreTools() {
        return this.coreTools;
    }
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
    getPermissionsAllow() {
        const base = this.permissionsAllow ?? [];
        const sdkAllow = [...(this.allowedTools ?? [])];
        if (sdkAllow.length === 0) {
            return base.length > 0 ? base : [];
        }
        const merged = [...base];
        for (const t of sdkAllow) {
            if (t && !merged.includes(t)) {
                merged.push(t);
            }
        }
        return merged;
    }
    getPermissionsAsk() {
        return this.permissionsAsk;
    }
    /**
     * Returns the merged deny-rules for PermissionManager.
     *
     * Merges:
     *   - settings.permissions.deny  (persistent rules from all scopes)
     *   - excludeTools param  (SDK / argv blocklist)
     *
     * CLI callers pre-merge argv.excludeTools into permissionsDeny.
     */
    getPermissionsDeny() {
        const base = this.permissionsDeny ?? [];
        const sdkDeny = this.excludeTools ?? [];
        if (sdkDeny.length === 0) {
            return base.length > 0 ? base : [];
        }
        const merged = [...base];
        for (const t of sdkDeny) {
            if (t && !merged.includes(t)) {
                merged.push(t);
            }
        }
        return merged;
    }
    getToolDiscoveryCommand() {
        return this.toolDiscoveryCommand;
    }
    getToolCallCommand() {
        return this.toolCallCommand;
    }
    getMcpServerCommand() {
        return this.mcpServerCommand;
    }
    getMcpServers() {
        let mcpServers = { ...(this.mcpServers || {}) };
        const extensions = this.getActiveExtensions();
        for (const extension of extensions) {
            Object.entries(extension.config.mcpServers || {}).forEach(([key, server]) => {
                if (mcpServers[key]) {
                    return;
                }
                mcpServers[key] = {
                    ...server,
                    extensionName: extension.config.name
                };
            });
        }
        if (this.allowedMcpServers) {
            mcpServers = Object.fromEntries(Object.entries(mcpServers).filter(([key]) => this.allowedMcpServers?.includes(key)));
        }
        // Note: We no longer filter out excluded servers here.
        // The UI layer should check isMcpServerDisabled() to determine
        // whether to show a server as disabled.
        return mcpServers;
    }
    getExcludedMcpServers() {
        return this.excludedMcpServers;
    }
    setExcludedMcpServers(excluded) {
        this.excludedMcpServers = excluded;
    }
    isMcpServerDisabled(serverName) {
        return this.excludedMcpServers?.includes(serverName) ?? false;
    }
    addMcpServers(servers) {
        if (this.initialized) {
            throw new Error('Cannot modify mcpServers after initialization');
        }
        this.mcpServers = { ...this.mcpServers, ...servers };
    }
    isLspEnabled() {
        return this.lspEnabled;
    }
    getLspClient() {
        return this.lspClient;
    }
    /**
     * Allows wiring an LSP client after Config construction but before initialize().
     */
    setLspClient(client) {
        if (this.initialized) {
            throw new Error('Cannot set LSP client after initialization');
        }
        this.lspClient = client;
    }
    getSessionSubagents() {
        return this.sessionSubagents;
    }
    setSessionSubagents(subagents) {
        if (this.initialized) {
            throw new Error('Cannot modify sessionSubagents after initialization');
        }
        this.sessionSubagents = subagents;
    }
    getSdkMode() {
        return this.sdkMode;
    }
    setSdkMode(value) {
        this.sdkMode = value;
    }
    getUserMemory() {
        return this.userMemory;
    }
    setUserMemory(newUserMemory) {
        this.userMemory = newUserMemory;
    }
    getGeminiMdFileCount() {
        return this.geminiMdFileCount;
    }
    setGeminiMdFileCount(count) {
        this.geminiMdFileCount = count;
    }
    getArenaManager() {
        return this.arenaManager;
    }
    setArenaManager(manager) {
        this.arenaManager = manager;
        this.arenaManagerChangeCallback?.(manager);
    }
    /**
     * Register a callback invoked whenever the arena manager changes.
     * Pass `null` to unsubscribe. Only one subscriber is supported.
     */
    onArenaManagerChange(cb) {
        this.arenaManagerChangeCallback = cb;
    }
    getArenaAgentClient() {
        return this.arenaAgentClient;
    }
    getAgentsSettings() {
        return this.agentsSettings;
    }
    /**
     * Clean up Arena runtime. When `force` is true (e.g., /arena select --discard),
     * always removes worktrees regardless of preserveArtifacts.
     */
    async cleanupArenaRuntime(force) {
        const manager = this.arenaManager;
        if (!manager) {
            return;
        }
        if (!force && this.agentsSettings.arena?.preserveArtifacts) {
            await manager.cleanupRuntime();
        }
        else {
            await manager.cleanup();
        }
        this.setArenaManager(null);
    }
    getApprovalMode() {
        return this.approvalMode;
    }
    setApprovalMode(mode) {
        if (!this.isTrustedFolder() &&
            mode !== ApprovalMode.DEFAULT &&
            mode !== ApprovalMode.PLAN) {
            throw new Error('Cannot enable privileged approval modes in an untrusted folder.');
        }
        this.approvalMode = mode;
    }
    getInputFormat() {
        return this.inputFormat;
    }
    getIncludePartialMessages() {
        return this.includePartialMessages;
    }
    getAccessibility() {
        return this.accessibility;
    }
    getTelemetryEnabled() {
        return this.telemetrySettings.enabled ?? false;
    }
    getTelemetryLogPromptsEnabled() {
        return this.telemetrySettings.logPrompts ?? true;
    }
    getTelemetryOtlpEndpoint() {
        return this.telemetrySettings.otlpEndpoint ?? DEFAULT_OTLP_ENDPOINT;
    }
    getTelemetryOtlpProtocol() {
        return this.telemetrySettings.otlpProtocol ?? 'grpc';
    }
    getTelemetryTarget() {
        return this.telemetrySettings.target ?? DEFAULT_TELEMETRY_TARGET;
    }
    getTelemetryOutfile() {
        return this.telemetrySettings.outfile;
    }
    getGitCoAuthor() {
        return this.gitCoAuthor;
    }
    getTelemetryUseCollector() {
        return this.telemetrySettings.useCollector ?? false;
    }
    getGeminiClient() {
        return this.geminiClient;
    }
    getCronScheduler() {
        if (!this.cronScheduler) {
            this.cronScheduler = new CronScheduler();
        }
        return this.cronScheduler;
    }
    isCronEnabled() {
        // Cron is experimental and opt-in: enabled via settings or env var
        if (process.env.AETHER_CODE_ENABLE_CRON === '1') {
            return true;
        }
        return this.cronEnabled;
    }
    getEnableRecursiveFileSearch() {
        return this.fileFiltering.enableRecursiveFileSearch;
    }
    getFileFilteringEnableFuzzySearch() {
        return this.fileFiltering.enableFuzzySearch;
    }
    getFileFilteringRespectGitIgnore() {
        return this.fileFiltering.respectGitIgnore;
    }
    getFileFilteringRespectAetherIgnore() {
        return this.fileFiltering.respectAetherIgnore;
    }
    getFileFilteringOptions() {
        return {
            respectGitIgnore: this.fileFiltering.respectGitIgnore,
            respectAetherIgnore: this.fileFiltering.respectAetherIgnore,
            respectQwenIgnore: this.fileFiltering.respectQwenIgnore
        };
    }
    /**
     * Gets custom file exclusion patterns from configuration.
     * TODO: This is a placeholder implementation. In the future, this could
     * read from settings files, CLI arguments, or environment variables.
     */
    getCustomExcludes() {
        // Placeholder implementation - returns empty array for now
        // Future implementation could read from:
        // - User settings file
        // - Project-specific configuration
        // - Environment variables
        // - CLI arguments
        return [];
    }
    getCheckpointingEnabled() {
        return this.checkpointing;
    }
    getProxy() {
        return normalizeProxyUrl(this.proxy);
    }
    getWorkingDir() {
        return this.cwd;
    }
    getBugCommand() {
        return this.bugCommand;
    }
    getFileService() {
        if (!this.fileDiscoveryService) {
            this.fileDiscoveryService = new FileDiscoveryService(this.targetDir);
        }
        return this.fileDiscoveryService;
    }
    getUsageStatisticsEnabled() {
        return this.usageStatisticsEnabled;
    }
    getExtensionContextFilePaths() {
        const extensionContextFilePaths = this.getActiveExtensions().flatMap((e) => e.contextFiles);
        return [
            ...extensionContextFilePaths,
            ...(this.outputLanguageFilePath
                ? [this.outputLanguageFilePath]
                : [])
        ];
    }
    getExperimentalZedIntegration() {
        return this.experimentalZedIntegration;
    }
    getListExtensions() {
        return this.listExtensions;
    }
    getExtensionManager() {
        return this.extensionManager;
    }
    /**
     * Get the hook system instance if hooks are enabled.
     * Returns undefined if hooks are not enabled.
     */
    getHookSystem() {
        return this.hookSystem;
    }
    /**
     * Fast-path check: returns true only when hooks are enabled AND there are
     * registered hooks for the given event name.  Callers can use this to skip
     * expensive MessageBus round-trips when no hooks are configured.
     */
    hasHooksForEvent(eventName) {
        return this.hookSystem?.hasHooksForEvent(eventName) ?? false;
    }
    /**
     * Check if all hooks are disabled.
     */
    getDisableAllHooks() {
        return this.disableAllHooks;
    }
    /**
     * Get the message bus instance.
     * Returns undefined if not set.
     */
    getMessageBus() {
        return this.messageBus;
    }
    /**
     * Set the message bus instance.
     * This is called by the CLI layer to inject the MessageBus.
     */
    setMessageBus(messageBus) {
        this.messageBus = messageBus;
    }
    /**
     * Get project-level hooks configuration.
     * This is used by the HookRegistry to load project-specific hooks.
     */
    getProjectHooks() {
        // This will be populated from settings by the CLI layer
        // The core Config doesn't have direct access to settings
        return undefined;
    }
    /**
     * Get all hooks configuration (merged from all sources).
     * This is used by the HookRegistry to load hooks.
     */
    getHooks() {
        return this.hooks;
    }
    getExtensions() {
        const extensions = this.extensionManager.getLoadedExtensions();
        if (this.overrideExtensions) {
            return extensions.filter((e) => this.overrideExtensions?.includes(e.name));
        }
        else {
            return extensions;
        }
    }
    getActiveExtensions() {
        return this.getExtensions().filter((e) => e.isActive);
    }
    getBlockedMcpServers() {
        const mcpServers = { ...(this.mcpServers || {}) };
        const extensions = this.getActiveExtensions();
        for (const extension of extensions) {
            Object.entries(extension.config.mcpServers || {}).forEach(([key, server]) => {
                if (mcpServers[key]) {
                    return;
                }
                mcpServers[key] = {
                    ...server,
                    extensionName: extension.config.name
                };
            });
        }
        const blockedMcpServers = [];
        if (this.allowedMcpServers) {
            Object.entries(mcpServers).forEach(([key, server]) => {
                const isAllowed = this.allowedMcpServers?.includes(key);
                if (!isAllowed) {
                    blockedMcpServers.push({
                        name: key,
                        extensionName: server.extensionName || ''
                    });
                }
            });
        }
        return blockedMcpServers;
    }
    getNoBrowser() {
        return this.noBrowser;
    }
    isBrowserLaunchSuppressed() {
        return this.getNoBrowser() || !shouldAttemptBrowserLaunch();
    }
    // Web search provider configuration
    getWebSearchConfig() {
        return this.webSearch;
    }
    getIdeMode() {
        return this.ideMode;
    }
    getFolderTrustFeature() {
        return this.folderTrustFeature;
    }
    /**
     * Returns 'true' if the workspace is considered "trusted".
     * 'false' for untrusted.
     */
    getFolderTrust() {
        return this.folderTrust;
    }
    isTrustedFolder() {
        // isWorkspaceTrusted in cli/src/config/trustedFolder.js returns undefined
        // when the file based trust value is unavailable, since it is mainly used
        // in the initialization for trust dialogs, etc. Here we return true since
        // config.isTrustedFolder() is used for the main business logic of blocking
        // tool calls etc in the rest of the application.
        //
        // Default value is true since we load with trusted settings to avoid
        // restarts in the more common path. If the user chooses to mark the folder
        // as untrusted, the CLI will restart and we will have the trust value
        // reloaded.
        const context = ideContextStore.get();
        if (context?.workspaceState?.isTrusted !== undefined) {
            return context.workspaceState.isTrusted;
        }
        return this.trustedFolder ?? true;
    }
    setIdeMode(value) {
        this.ideMode = value;
    }
    getAuthType() {
        return this.contentGeneratorConfig?.authType;
    }
    getCliVersion() {
        return this.cliVersion;
    }
    getChannel() {
        return this.channel;
    }
    /**
     * Get the default file encoding for new files.
     * @returns FileEncodingType
     */
    getDefaultFileEncoding() {
        return this.defaultFileEncoding;
    }
    /**
     * Get the current FileSystemService
     */
    getFileSystemService() {
        return this.fileSystemService;
    }
    /**
     * Set a custom FileSystemService
     */
    setFileSystemService(fileSystemService) {
        this.fileSystemService = fileSystemService;
    }
    getChatCompression() {
        return this.chatCompression;
    }
    isInteractive() {
        return this.interactive;
    }
    getUseRipgrep() {
        return this.useRipgrep;
    }
    getUseBuiltinRipgrep() {
        return this.useBuiltinRipgrep;
    }
    getShouldUseNodePtyShell() {
        return this.shouldUseNodePtyShell;
    }
    getSkipNextSpeakerCheck() {
        return this.skipNextSpeakerCheck;
    }
    getShellExecutionConfig() {
        return this.shellExecutionConfig;
    }
    setShellExecutionConfig(config) {
        this.shellExecutionConfig = {
            terminalWidth: config.terminalWidth ?? this.shellExecutionConfig.terminalWidth,
            terminalHeight: config.terminalHeight ??
                this.shellExecutionConfig.terminalHeight,
            showColor: config.showColor ?? this.shellExecutionConfig.showColor,
            pager: config.pager ?? this.shellExecutionConfig.pager
        };
    }
    getScreenReader() {
        return this.accessibility.screenReader ?? false;
    }
    getSkipLoopDetection() {
        return this.skipLoopDetection;
    }
    getSkipStartupContext() {
        return this.skipStartupContext;
    }
    getTruncateToolOutputThreshold() {
        if (this.truncateToolOutputThreshold <= 0) {
            return Number.POSITIVE_INFINITY;
        }
        return this.truncateToolOutputThreshold;
    }
    getTruncateToolOutputLines() {
        if (this.truncateToolOutputLines <= 0) {
            return Number.POSITIVE_INFINITY;
        }
        return this.truncateToolOutputLines;
    }
    getOutputFormat() {
        return this.outputFormat;
    }
    async getGitService() {
        if (!this.gitService) {
            this.gitService = new GitService(this.targetDir, this.storage);
            await this.gitService.initialize();
        }
        return this.gitService;
    }
    /**
     * Returns the chat recording service.
     */
    getChatRecordingService() {
        if (!this.chatRecordingEnabled) {
            return undefined;
        }
        if (!this.chatRecordingService) {
            this.chatRecordingService = new ChatRecordingService(this);
        }
        return this.chatRecordingService;
    }
    /**
     * Returns the transcript file path for the current session.
     * This is the path to the JSONL file where the conversation is recorded.
     * Returns empty string if chat recording is disabled.
     */
    getTranscriptPath() {
        if (!this.chatRecordingEnabled) {
            return '';
        }
        const projectDir = this.storage.getProjectDir();
        const sessionId = this.getSessionId();
        const safeFilename = `${sessionId}.jsonl`;
        return path.join(projectDir, 'chats', safeFilename);
    }
    /**
     * Gets or creates a SessionService for managing chat sessions.
     */
    getSessionService() {
        if (!this.sessionService) {
            this.sessionService = new SessionService(this.targetDir);
        }
        return this.sessionService;
    }
    getFileExclusions() {
        return this.fileExclusions;
    }
    getSubagentManager() {
        return this.subagentManager;
    }
    getSkillManager() {
        return this.skillManager;
    }
    getPermissionManager() {
        return this.permissionManager;
    }
    /**
     * Returns the callback for persisting permission rules to settings files.
     * Returns undefined if no callback was provided (e.g. SDK mode).
     */
    getOnPersistPermissionRule() {
        return this.onPersistPermissionRuleCallback;
    }
    async createToolRegistry(sendSdkMcpMessage, options) {
        const registry = new ToolRegistry(this, this.eventEmitter, sendSdkMcpMessage);
        // Helper to create & register core tools that are enabled
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const registerCoreTool = async (ToolClass, ...args) => {
            const toolName = ToolClass?.Name;
            const className = ToolClass?.name ?? 'UnknownTool';
            if (!toolName) {
                // Log warning and skip this tool instead of crashing
                this.debugLogger.warn(`Skipping tool registration: ${className} is missing static Name property. ` +
                    `Tools must define a static Name property to be registered.`);
                return;
            }
            // PermissionManager handles both the coreTools allowlist (registry-level)
            // and deny rules (runtime-level) in a single check.
            const pmEnabled = this.permissionManager
                ? await this.permissionManager.isToolEnabled(toolName)
                : true; // Should never reach here after initialize(), but safe default.
            if (pmEnabled) {
                try {
                    registry.registerTool(new ToolClass(...args));
                }
                catch (error) {
                    this.debugLogger.error(`Failed to register tool ${className} (${toolName}):`, error);
                    throw error; // Re-throw after logging context
                }
            }
        };
        await registerCoreTool(AgentTool, this);
        await registerCoreTool(SkillTool, this);
        await registerCoreTool(LSTool, this);
        await registerCoreTool(ReadFileTool, this);
        if (this.getUseRipgrep()) {
            let useRipgrep = false;
            let errorString;
            try {
                useRipgrep = await canUseRipgrep(this.getUseBuiltinRipgrep());
            }
            catch (error) {
                errorString = getErrorMessage(error);
            }
            if (useRipgrep) {
                await registerCoreTool(RipGrepTool, this);
            }
            else {
                // Log for telemetry
                logRipgrepFallback(this, new RipgrepFallbackEvent(this.getUseRipgrep(), this.getUseBuiltinRipgrep(), errorString || 'ripgrep is not available'));
                await registerCoreTool(GrepTool, this);
            }
        }
        else {
            await registerCoreTool(GrepTool, this);
        }
        await registerCoreTool(GlobTool, this);
        await registerCoreTool(EditTool, this);
        await registerCoreTool(WriteFileTool, this);
        await registerCoreTool(ShellTool, this);
        await registerCoreTool(MemoryTool);
        await registerCoreTool(TodoWriteTool, this);
        await registerCoreTool(AskUserQuestionTool, this);
        !this.sdkMode && (await registerCoreTool(ExitPlanModeTool, this));
        await registerCoreTool(WebFetchTool, this);
        // Conditionally register web search tool if web search provider is configured
        // buildWebSearchConfig ensures aether-oauth users get dashscope provider, so
        // if tool is registered, config must exist
        if (this.getWebSearchConfig()) {
            await registerCoreTool(WebSearchTool, this);
        }
        if (this.isLspEnabled() && this.getLspClient()) {
            // Register the unified LSP tool
            await registerCoreTool(LspTool, this);
        }
        // Register cron tools unless disabled
        if (this.isCronEnabled()) {
            await registerCoreTool(CronCreateTool, this);
            await registerCoreTool(CronListTool, this);
            await registerCoreTool(CronDeleteTool, this);
        }
        if (!options?.skipDiscovery) {
            await registry.discoverAllTools();
        }
        this.debugLogger.debug(`ToolRegistry created: ${JSON.stringify(registry.getAllToolNames())} (${registry.getAllToolNames().length} tools)`);
        return registry;
    }
}
//# sourceMappingURL=config.js.map