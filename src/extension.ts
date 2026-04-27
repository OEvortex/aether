import * as vscode from 'vscode';
import {
    AccountManager,
    AccountQuotaCache,
    AccountSyncAdapter,
    registerAccountCommands
} from './accounts';
import { createAndActivateInlineCompletionContribution } from './copilot/inlineCompletionContribution';
import type { InlineCompletionShim } from './copilot/inlineCompletionShim';
import {
    BridgeViewProvider,
    ExtensionTreeItem,
    ToolTreeItem
} from './mcpBridge/bridgeView';
import { type HttpMcpServer, startHttpMcpServer } from './mcpBridge/httpServer';
import { BridgeStatusBar } from './mcpBridge/statusBar';
import { ToolRegistry } from './mcpBridge/toolRegistry';
import type { FilterConfig } from './mcpBridge/types';
import { CodexProvider } from './providers/codex/codexProvider';
import { CompatibleProvider } from './providers/compatible/compatibleProvider';
import { LeaderElectionService, StatusBarManager } from './status';
import { registerAllTools } from './tools';
import { ProviderKey } from './types/providerKeys';
import { registerSettingsPageCommand } from './ui';
import {
    ApiKeyManager,
    CompletionLogger,
    ConfigManager,
    JsonSchemaProvider,
    Logger,
    launchOpenClaudeFromExtension,
    SettingsMigrator,
    StatusLogger
} from './utils';
import { CompatibleModelManager } from './utils/compatibleModelManager';
import {
    type RegisteredProvider,
    registerProvidersFromConfig
} from './utils/knownProviders';
import { ModelSelector } from './utils/modelSelector';

/**
 * Global variables - Store registered provider instances for cleanup on extension uninstall
 */
const registeredProviders: Record<string, RegisteredProvider> = {};
const registeredDisposables: vscode.Disposable[] = [];

// Inline completion provider instance (using lightweight Shim, lazy loading real completion engine)
let inlineCompletionProvider: InlineCompletionShim | undefined;

let mcpHttpServer: HttpMcpServer | undefined;
let mcpRegistry: ToolRegistry | undefined;
let mcpOutputChannel: vscode.OutputChannel | undefined;
let mcpStatusBar: BridgeStatusBar | undefined;
let mcpTreeView: vscode.TreeView<unknown> | undefined;
let mcpViewProvider: BridgeViewProvider | undefined;

/**
 * Activate providers - dynamic registration based on config file using registry pattern
 */
async function activateProviders(
    context: vscode.ExtensionContext
): Promise<void> {
    const configProvider = ConfigManager.getConfigProvider();

    if (!configProvider) {
        Logger.warn(
            'Provider configuration not found, skipping provider registration'
        );
        return;
    }

    // Register all providers using the registry (excludes Codex which is registered separately)
    const result = await registerProvidersFromConfig(
        context,
        configProvider,
        [ProviderKey.Codex] // Exclude Codex - registered separately with specialized provider
    );

    // Store registered providers and disposables
    Object.assign(registeredProviders, result.providers);
    registeredDisposables.push(...result.disposables);
}

/**
 * Activate compatible provider
 */
async function activateCompatibleProvider(
    context: vscode.ExtensionContext
): Promise<void> {
    try {
        Logger.trace('Registering compatible provider...');
        const providerStartTime = Date.now();

        // Create and activate compatible provider
        const result = CompatibleProvider.createAndActivate(context);
        const provider = result.provider;
        const disposables = result.disposables;

        // Store registered providers and disposables
        registeredProviders.compatible = provider;
        registeredDisposables.push(...disposables);

        const providerTime = Date.now() - providerStartTime;
        Logger.info(
            `Compatible Provider registered successfully (time: ${providerTime}ms)`
        );
    } catch (error) {
        Logger.error('Failed to register compatible provider:', error);
    }
}

/**
 * Activate inline completion provider (lightweight Shim, lazy load the actual completion engine)
 */
async function activateInlineCompletionProvider(
    context: vscode.ExtensionContext
): Promise<void> {
    try {
        Logger.trace('Registering inline completion provider (Shim mode)...');
        const providerStartTime = Date.now();

        // Register lightweight shim and related commands without loading @vscode/chat-lib
        const result = createAndActivateInlineCompletionContribution(context);
        inlineCompletionProvider = result.provider;
        registeredDisposables.push(...result.disposables);

        const providerTime = Date.now() - providerStartTime;
        Logger.info(
            `Inline completion provider registered successfully - Shim mode (time: ${providerTime}ms)`
        );
    } catch (error) {
        Logger.error('Failed to register inline completion provider:', error);
    }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
    // Store singleton instances in globalThis for use by modules in copilot.bundle.js
    globalThis.__chp_singletons = {
        CompletionLogger,
        ApiKeyManager,
        ConfigManager
    };

    const activationStartTime = Date.now();

    try {
        Logger.initialize('Aether'); // Initialize log manager
        StatusLogger.initialize('GitHub Copilot Models Provider Status'); // Initialize high-frequency status log manager
        LeaderElectionService.initialize(context); // Initialize leader election service for status bars
        CompletionLogger.initialize('Aether Inline Completion'); // Initialize high-frequency inline completion log manager

        const isDevelopment =
            context.extensionMode === vscode.ExtensionMode.Development;
        Logger.info(
            `Aether Extension Mode: ${isDevelopment ? 'Development' : 'Production'}`
        );
        // Check and prompt VS Code log level settings
        if (isDevelopment) {
            Logger.checkAndPromptLogLevel();
        }

        Logger.info('⏱️ Starting Aether extension activation...');

        // Run settings migration from old prefix (chp.*) to new prefix (aether.*)
        let stepStartTime = Date.now();
        await SettingsMigrator.migrateIfNeeded(context);
        Logger.trace(
            `⏱️ Settings migration check completed (time: ${Date.now() - stepStartTime}ms)`
        );

        // Register settings page command early so it is available even if later initialization errors occur
        stepStartTime = Date.now();
        const settingsPageDisposable = registerSettingsPageCommand(context);
        context.subscriptions.push(settingsPageDisposable);
        Logger.trace(
            `⏱️ Settings page command registered (time: ${Date.now() - stepStartTime}ms)`
        );

        stepStartTime = Date.now();
        const openClaudeCommand = vscode.commands.registerCommand(
            'aether.cli.start',
            async () => {
                try {
                    await launchOpenClaudeFromExtension(context);
                } catch (error) {
                    const message =
                        error instanceof Error ? error.message : String(error);
                    Logger.error('Failed to launch Aether CLI:', error);
                    vscode.window.showErrorMessage(
                        `Failed to launch Aether CLI: ${message}`
                    );
                }
            }
        );
        context.subscriptions.push(openClaudeCommand);
        Logger.trace(
            `⏱️ Aether CLI launch command registered (time: ${Date.now() - stepStartTime}ms)`
        );

        // Step 1: Initialize API key manager
        stepStartTime = Date.now();
        ApiKeyManager.initialize(context);
        Logger.trace(
            `⏱️ API key manager initialization complete (time: ${Date.now() - stepStartTime}ms)`
        );

        // Step 1.0: Initialize model selector and register aether.selectModel command
        ModelSelector.initialize(context);
        const selectModelCmd = vscode.commands.registerCommand(
            'aether.selectModel',
            async () => {
                await ModelSelector.showModelPicker();
            }
        );
        context.subscriptions.push(selectModelCmd);

        // Step 1.1: Initialize multi-account manager
        stepStartTime = Date.now();
        AccountManager.initialize(context);
        // Initialize Account Quota Cache
        AccountQuotaCache.initialize(context);
        // Initialize Status Bar Manager (includes quota and token usage status bars)
        StatusBarManager.initializeAll(context);
        const accountDisposables = registerAccountCommands(context);
        context.subscriptions.push(...accountDisposables);
        // Initialize account sync adapter and sync existing accounts
        const accountSyncAdapter = AccountSyncAdapter.initialize();
        context.subscriptions.push({
            dispose: () => accountSyncAdapter.dispose()
        });
        // Asynchronously sync existing accounts (non-blocking startup)
        accountSyncAdapter
            .syncAllAccounts()
            .catch((err: unknown) => Logger.warn('Account sync failed:', err));

        Logger.trace(
            `⏱️ Multi-account manager initialization complete (time: ${Date.now() - stepStartTime}ms)`
        );

        // Step 2: Initialize configuration manager
        stepStartTime = Date.now();
        const configDisposable = ConfigManager.initialize(context);
        context.subscriptions.push(configDisposable);
        Logger.trace(
            `⏱️ Configuration manager initialized (time: ${Date.now() - stepStartTime}ms)`
        );
        // Step 2.1: Initialize JSON Schema provider
        stepStartTime = Date.now();
        JsonSchemaProvider.initialize();
        context.subscriptions.push({
            dispose: () => JsonSchemaProvider.dispose()
        });
        Logger.trace(
            `⏱️ JSON Schema provider initialized (time: ${Date.now() - stepStartTime}ms)`
        );
        // Step 2.2: Initialize compatible model manager
        stepStartTime = Date.now();
        CompatibleModelManager.initialize();
        Logger.trace(
            `⏱️ Compatible model manager initialized (time: ${Date.now() - stepStartTime}ms)`
        );

        // Step 3: Activate providers (parallel optimization)
        stepStartTime = Date.now();
        await activateProviders(context);
        Logger.trace(
            `⏱️ Model provider registration complete (time: ${Date.now() - stepStartTime}ms)`
        );
        // Step 3.1: Activate compatible provider
        stepStartTime = Date.now();
        await activateCompatibleProvider(context);
        Logger.trace(
            `⏱️ Compatible provider registration complete (time: ${Date.now() - stepStartTime}ms)`
        );

        // Step 4: Register tools
        stepStartTime = Date.now();
        registerAllTools(context);
        Logger.trace(
            `⏱️ Tools registered (time: ${Date.now() - stepStartTime}ms)`
        );

        // Step 4.2: Activate Codex Provider (OpenAI GPT-5)
        stepStartTime = Date.now();
        const codexResult = CodexProvider.createAndActivate(context);
        registeredProviders[ProviderKey.Codex] = codexResult.provider;
        registeredDisposables.push(...codexResult.disposables);
        Logger.trace(
            `⏱️ Codex Provider registered (time: ${Date.now() - stepStartTime}ms)`
        );

        // Step 5: Register inline completion provider (lightweight Shim, lazy load the actual completion engine)
        stepStartTime = Date.now();
        await activateInlineCompletionProvider(context);
        Logger.trace(
            `⏱️ NES inline completion provider registered (time: ${Date.now() - stepStartTime}ms)`
        );

        // Step 6: Register Copilot helper commands
        stepStartTime = Date.now();
        const copilotAttachSelectionCmd = vscode.commands.registerCommand(
            'aether.copilot.attachSelection',
            async () => {
                try {
                    const editor = vscode.window.activeTextEditor;
                    if (!editor) {
                        vscode.window.showWarningMessage(
                            'No active editor found.'
                        );
                        return;
                    }

                    const selection = editor.selection;
                    const document = editor.document;
                    const fileName =
                        document.fileName.split('/').pop() || document.fileName;

                    let lineRange: string;
                    if (selection.start.line === selection.end.line) {
                        lineRange = `${selection.start.line + 1}`;
                    } else {
                        lineRange = `${selection.start.line + 1}-${selection.end.line + 1}`;
                    }

                    const referenceText = `@${fileName}:${lineRange} `;

                    await vscode.commands.executeCommand(
                        'workbench.panel.chat.view.copilot.focus'
                    );
                    await vscode.commands.executeCommand(
                        'workbench.action.chat.insertIntoInput',
                        referenceText
                    );
                } catch (error) {
                    Logger.warn(
                        'Unable to execute Copilot attach selection:',
                        error
                    );
                    vscode.window.showWarningMessage(
                        'Failed to insert reference to Copilot Chat. Make sure GitHub Copilot Chat is installed.'
                    );
                }
            }
        );
        context.subscriptions.push(copilotAttachSelectionCmd);

        // Command: Insert file handle reference with line range (format: #handle:filename:L1-L100)
        const copilotInsertHandleCmd = vscode.commands.registerCommand(
            'aether.copilot.insertHandle',
            async () => {
                try {
                    const editor = vscode.window.activeTextEditor;
                    if (!editor) {
                        vscode.window.showWarningMessage(
                            'No active editor found.'
                        );
                        return;
                    }

                    const selection = editor.selection;
                    const document = editor.document;
                    const fileName =
                        document.fileName.split('/').pop() || document.fileName;

                    let lineRange: string;
                    if (selection.isEmpty) {
                        // No selection - use current line
                        lineRange = `L${selection.start.line + 1}`;
                    } else if (selection.start.line === selection.end.line) {
                        // Single line selection
                        lineRange = `L${selection.start.line + 1}`;
                    } else {
                        // Multi-line selection
                        lineRange = `L${selection.start.line + 1}-L${selection.end.line + 1}`;
                    }

                    // Format: #handle:filename:L1-L100 (e.g., #handle:extension.ts:L1-L100)
                    const handleText = `#file:${fileName}:${lineRange} `;

                    // Focus Copilot Chat panel
                    await vscode.commands.executeCommand(
                        'workbench.panel.chat.view.copilot.focus'
                    );
                    // Use 'type' command to insert text at cursor position (appends to existing text)
                    await vscode.commands.executeCommand('type', {
                        text: handleText
                    });

                    Logger.trace(`Inserted handle reference: ${handleText}`);
                } catch (error) {
                    Logger.warn('Unable to insert handle reference:', error);
                    vscode.window.showWarningMessage(
                        'Failed to insert handle reference to Copilot Chat. Make sure GitHub Copilot Chat is installed.'
                    );
                }
            }
        );
        context.subscriptions.push(copilotInsertHandleCmd);

        // Command: Insert file handle with full path reference (format: #handle:path/to/file.ts:L1-L100)
        const copilotInsertHandleFullPathCmd = vscode.commands.registerCommand(
            'aether.copilot.insertHandleFullPath',
            async () => {
                try {
                    const editor = vscode.window.activeTextEditor;
                    if (!editor) {
                        vscode.window.showWarningMessage(
                            'No active editor found.'
                        );
                        return;
                    }

                    const selection = editor.selection;
                    const document = editor.document;

                    // Get relative path from workspace
                    const workspaceFolder = vscode.workspace.getWorkspaceFolder(
                        document.uri
                    );
                    let relativePath: string;
                    if (workspaceFolder) {
                        relativePath = vscode.workspace.asRelativePath(
                            document.uri,
                            false
                        );
                    } else {
                        relativePath =
                            document.fileName.split('/').pop() ||
                            document.fileName;
                    }

                    let lineRange: string;
                    if (selection.isEmpty) {
                        lineRange = `L${selection.start.line + 1}`;
                    } else if (selection.start.line === selection.end.line) {
                        lineRange = `L${selection.start.line + 1}`;
                    } else {
                        lineRange = `L${selection.start.line + 1}-L${selection.end.line + 1}`;
                    }

                    // Format: #handle:path/to/file.ts:L1-L100
                    const handleText = `#handle:${relativePath}:${lineRange} `;

                    // Focus Copilot Chat panel
                    await vscode.commands.executeCommand(
                        'workbench.panel.chat.view.copilot.focus'
                    );
                    // Use 'type' command to insert text at cursor position (appends to existing text)
                    await vscode.commands.executeCommand('type', {
                        text: handleText
                    });
                } catch (error) {
                    Logger.warn(
                        'Unable to insert handle reference with full path:',
                        error
                    );
                    vscode.window.showWarningMessage(
                        'Failed to insert handle reference to Copilot Chat.'
                    );
                }
            }
        );
        context.subscriptions.push(copilotInsertHandleFullPathCmd);

        // Command: Show all stored API keys
        const showAllApiKeysCmd = vscode.commands.registerCommand(
            'aether.showAllApiKeys',
            async () => {
                await ApiKeyManager.showAllApiKeys();
            }
        );
        context.subscriptions.push(showAllApiKeysCmd);

        Logger.trace(
            `⏱️ Copilot helper commands registered (time: ${Date.now() - stepStartTime}ms)`
        );

        const totalActivationTime = Date.now() - activationStartTime;
        Logger.info(
            `Aether extension activation completed (total time: ${totalActivationTime}ms)`
        );

        // Initialize MCP Bridge
        mcpOutputChannel =
            vscode.window.createOutputChannel('Aether MCP Bridge');
        context.subscriptions.push(mcpOutputChannel);

        function getMcpFilterConfig(): FilterConfig {
            const config =
                vscode.workspace.getConfiguration('aether.mcpBridge');
            return {
                includeTools: config.get<string[]>('tools.include', ['**']),
                excludeTools: config.get<string[]>('tools.exclude', []),
                includeExtensions: config.get<string[]>('extensions.include', [
                    '**'
                ]),
                excludeExtensions: config.get<string[]>(
                    'extensions.exclude',
                    []
                )
            };
        }

        mcpRegistry = new ToolRegistry(
            getMcpFilterConfig,
            vscode.workspace
                .getConfiguration('aether.mcpBridge')
                .get<number>('polling.intervalMs', 3000),
            mcpOutputChannel,
            context.globalState
        );
        mcpRegistry.start();
        context.subscriptions.push(mcpRegistry);

        mcpStatusBar = new BridgeStatusBar(mcpRegistry);
        context.subscriptions.push(mcpStatusBar);

        mcpViewProvider = new BridgeViewProvider(mcpRegistry);
        mcpTreeView = vscode.window.createTreeView(
            'aether.mcpBridge.toolsView',
            {
                treeDataProvider: mcpViewProvider
            }
        );
        context.subscriptions.push(mcpTreeView, mcpViewProvider);

        mcpTreeView.onDidChangeCheckboxState((e) => {
            for (const [item, state] of e.items) {
                if (item instanceof ExtensionTreeItem) {
                    mcpRegistry?.setGroupExposed(
                        item.toggleableToolNames,
                        state === vscode.TreeItemCheckboxState.Checked
                    );
                } else if (item instanceof ToolTreeItem) {
                    mcpRegistry?.setToolExposed(
                        item.toolName,
                        state === vscode.TreeItemCheckboxState.Checked
                    );
                }
            }
        });

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'aether.mcpBridge.startServer',
                async () => {
                    if (mcpHttpServer !== undefined) {
                        vscode.window.showWarningMessage(
                            'MCP server is already running'
                        );
                        return;
                    }
                    const config =
                        vscode.workspace.getConfiguration('aether.mcpBridge');
                    const port = config.get<number>('http.port', 59684);
                    try {
                        mcpHttpServer = await startHttpMcpServer({
                            port,
                            registry: mcpRegistry!,
                            outputChannel: mcpOutputChannel!,
                            onInvocation: (entry: { timestamp: string; toolName: string; status: string; durationMs: number }) => {
                                if (
                                    config.get<boolean>(
                                        'logging.logInvocations',
                                        true
                                    )
                                ) {
                                    mcpOutputChannel?.appendLine(
                                        `[invoke] ${entry.timestamp} ${entry.toolName} ${entry.status} ${entry.durationMs}ms`
                                    );
                                }
                            },
                            onToolBlocked: (toolName: string, reason: 'hidden' | 'disabled') => {
                                const msg =
                                    reason === 'disabled'
                                        ? `Tool "${toolName}" is disabled in VS Code`
                                        : `Tool "${toolName}" is hidden. Enable it in MCP Bridge panel`;
                                void vscode.window
                                    .showWarningMessage(msg, 'Open MCP Bridge')
                                    .then((choice) => {
                                        if (choice === 'Open MCP Bridge') {
                                            void vscode.commands.executeCommand(
                                                'aether.mcpBridge.toolsView.focus'
                                            );
                                        }
                                    });
                            }
                        });
                        mcpStatusBar.setServerInfo(mcpHttpServer.port);
                        await vscode.commands.executeCommand(
                            'setContext',
                            'aether.mcpBridge.serverRunning',
                            true
                        );
                        mcpOutputChannel?.appendLine(
                            `[extension] MCP server started on port ${mcpHttpServer.port}`
                        );
                        vscode.window.showInformationMessage(
                            `MCP Bridge server started on port ${mcpHttpServer.port}`
                        );
                    } catch (err) {
                        const msg =
                            err instanceof Error ? err.message : String(err);
                        mcpOutputChannel?.appendLine(
                            `[extension] Failed to start server: ${msg}`
                        );
                        vscode.window.showErrorMessage(
                            `Failed to start MCP server: ${msg}`
                        );
                    }
                }
            ),

            vscode.commands.registerCommand(
                'aether.mcpBridge.stopServer',
                async () => {
                    if (mcpHttpServer === undefined) {
                        return;
                    }
                    await mcpHttpServer.dispose();
                    mcpHttpServer = undefined;
                    mcpStatusBar?.clearServerInfo();
                    await vscode.commands.executeCommand(
                        'setContext',
                        'aether.mcpBridge.serverRunning',
                        false
                    );
                    mcpOutputChannel?.appendLine(
                        '[extension] MCP server stopped'
                    );
                    vscode.window.showInformationMessage(
                        'MCP Bridge server stopped'
                    );
                }
            ),

            vscode.commands.registerCommand(
                'aether.mcpBridge.restartServer',
                async () => {
                    mcpOutputChannel?.appendLine(
                        '[extension] Restarting MCP server...'
                    );
                    await vscode.commands.executeCommand(
                        'aether.mcpBridge.stopServer'
                    );
                    await vscode.commands.executeCommand(
                        'aether.mcpBridge.startServer'
                    );
                }
            ),

            vscode.commands.registerCommand(
                'aether.mcpBridge.refreshTools',
                () => {
                    mcpRegistry?.refresh();
                    const exposed = mcpRegistry?.getExposedTools().length ?? 0;
                    vscode.window.showInformationMessage(
                        `Refreshed tools. ${exposed} tools exposed`
                    );
                }
            ),

            vscode.commands.registerCommand(
                'aether.mcpBridge.exposeAllTools',
                async () => {
                    if (!mcpRegistry) {
                        vscode.window.showWarningMessage(
                            'MCP registry not initialized'
                        );
                        return;
                    }
                    const allTools = mcpRegistry.getAllTools();
                    for (const tool of allTools) {
                        if (!tool.disabledInVscode) {
                            mcpRegistry.setToolExposed(tool.name, true);
                        }
                    }
                    const exposed = mcpRegistry.getExposedTools().length;
                    vscode.window.showInformationMessage(
                        `Exposed ${exposed} tools via MCP`
                    );
                }
            ),

            vscode.commands.registerCommand('aether.mcpBridge.showLog', () => {
                mcpOutputChannel?.show();
            }),

            vscode.commands.registerCommand(
                'aether.mcpBridge.showStatus',
                async () => {
                    if (mcpHttpServer === undefined) {
                        vscode.window.showInformationMessage(
                            'MCP server is not running. Run "Aether: Start MCP Server" to start it.'
                        );
                        return;
                    }
                    const allTools = mcpRegistry?.getAllTools() ?? [];
                    const exposedTools = mcpRegistry?.getExposedTools() ?? [];
                    const msg =
                        `MCP Bridge Status\n` +
                        `Server: Running on port ${mcpHttpServer.port}\n` +
                        `URL: http://127.0.0.1:${mcpHttpServer.port}/mcp\n` +
                        `Total tools: ${allTools.length}\n` +
                        `Exposed tools: ${exposedTools.length}`;
                    vscode.window.showInformationMessage(msg);
                }
            ),

            vscode.commands.registerCommand(
                'aether.mcpBridge.copyMcpConfig',
                async () => {
                    if (mcpHttpServer === undefined) {
                        vscode.window.showWarningMessage(
                            'MCP server is not running'
                        );
                        return;
                    }
                    const port = mcpHttpServer.port;
                    const url = `http://127.0.0.1:${port}/mcp`;

                    const mcpConfigStdio = {
                        mcpServers: {
                            'aether-mcp-bridge': {
                                command: 'npx',
                                args: ['-y', 'mcp-remote', url, '--allow-http']
                            }
                        }
                    };

                    const mcpConfigHttp = {
                        mcpServers: {
                            'aether-mcp-bridge': {
                                type: 'streamableHttp',
                                url: url
                            }
                        }
                    };

                    const choice = await vscode.window.showQuickPick(
                        [
                            'Use mcp-remote (stdio bridge - recommended)',
                            'Use direct HTTP'
                        ],
                        { placeHolder: 'Choose MCP connection type' }
                    );

                    if (!choice) {
                        return;
                    }

                    const config = choice.includes('mcp-remote')
                        ? mcpConfigStdio
                        : mcpConfigHttp;
                    await vscode.env.clipboard.writeText(
                        JSON.stringify(config, null, 2)
                    );

                    const clientType = choice.includes('mcp-remote')
                        ? '.mcp.json (VS Code)'
                        : '.claude.json (Claude Code)';
                    vscode.window.showInformationMessage(
                        `MCP config copied! Use in ${clientType}`
                    );
                }
            ),

            vscode.commands.registerCommand(
                'aether.mcpBridge.openSettings',
                () => {
                    void vscode.commands.executeCommand(
                        'workbench.action.openSettings',
                        'aether.mcpBridge'
                    );
                }
            ),

            // Context menu commands for TreeView
            vscode.commands.registerCommand(
                'aether.mcpBridge.toggleTool',
                (item) => {
                    if (item instanceof ToolTreeItem) {
                        mcpRegistry?.toggleTool(item.toolName);
                    }
                }
            ),

            vscode.commands.registerCommand(
                'aether.mcpBridge.toggleGroup',
                (item) => {
                    if (item instanceof ExtensionTreeItem) {
                        const newState = !item.toggleableToolNames.every(
                            (name: string) => mcpRegistry?.getTool(name)?.exposed
                        );
                        mcpRegistry?.setGroupExposed(
                            item.toggleableToolNames,
                            newState
                        );
                    }
                }
            ),

            vscode.commands.registerCommand(
                'aether.mcpBridge.expandGroup',
                (item) => {
                    if (item instanceof ExtensionTreeItem) {
                        void vscode.commands.executeCommand(
                            'aether.mcpBridge.toolsView.focus'
                        );
                    }
                }
            )
        );

        // Auto-start server if enabled
        const mcpConfig = vscode.workspace.getConfiguration('aether.mcpBridge');
        if (mcpConfig.get<boolean>('http.enabled', true)) {
            await vscode.commands.executeCommand(
                'aether.mcpBridge.startServer'
            );
        }

        // Listen to configuration changes
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration('aether.mcpBridge')) {
                    if (
                        e.affectsConfiguration('aether.mcpBridge.http.port') ||
                        e.affectsConfiguration('aether.mcpBridge.http.enabled')
                    ) {
                        void vscode.commands.executeCommand(
                            'aether.mcpBridge.restartServer'
                        );
                    }
                    mcpRegistry?.refresh();
                }
            })
        );
    } catch (error) {
        const errorMessage = `Aether extension activation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        Logger.error(errorMessage, error instanceof Error ? error : undefined);

        // Try to display user-friendly error message
        vscode.window.showErrorMessage(
            'Aether extension startup failed. Please check the output window for details.'
        );
        // Re-throw error to let VS Code know extension startup failed
        throw error;
    }
}

// This method is called when your extension is deactivated
export function deactivate() {
    try {
        // Clean up all registered provider resources
        for (const [providerKey, provider] of Object.entries(
            registeredProviders
        )) {
            try {
                if (typeof provider.dispose === 'function') {
                    provider.dispose();
                    Logger.trace(
                        `Provider ${providerKey} resources cleaned up`
                    );
                }
            } catch (error) {
                Logger.warn(
                    `Error cleaning up provider ${providerKey} resources:`,
                    error
                );
            }
        }

        // Clean up inline completion provider
        if (inlineCompletionProvider) {
            inlineCompletionProvider.dispose();
            Logger.trace('Inline completion provider cleaned up');
        }

        // Clean up multi-account manager
        try {
            AccountManager.getInstance().dispose();
            Logger.trace('Multi-account manager cleaned up');
        } catch {
            // AccountManager may not be initialized
        }

        ConfigManager.dispose(); // Clean up configuration manager
        LeaderElectionService.stop(); // Clean up leader election service
        StatusLogger.dispose(); // Clean up status logger
        CompletionLogger.dispose(); // Clean up inline completion logger
        Logger.dispose(); // Dispose Logger only when extension is destroyed
    } catch (error) {
        Logger.error('Error during Aether extension deactivation:', error);
    }
}
