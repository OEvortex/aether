/*---------------------------------------------------------------------------------------------
 *  Qwen Code CLI Provider
 *--------------------------------------------------------------------------------------------*/

import type {
    CancellationToken,
    LanguageModelChatInformation,
    LanguageModelChatMessage,
    LanguageModelChatProvider,
    Progress,
    ProvideLanguageModelChatResponseOptions
} from 'vscode';
import * as vscode from 'vscode';
import {
    type Account,
    type AccountCredentials,
    AccountManager,
    type ApiKeyCredentials,
    type OAuthCredentials
} from '../../accounts';
import type { ModelConfig, ProviderConfig } from '../../types/sharedTypes';
import { ConfigManager } from '../../utils/configManager';
import { Logger } from '../../utils/logger';
import { getUserAgent } from '../../utils/userAgent';
import { GenericModelProvider } from '../common/genericModelProvider';
import { QwenOAuthManager } from './auth';

const QWEN_MODEL_OUTPUT_LIMITS: Record<string, number> = {
    'coder-model': 65536,
    'vision-model': 8192
};

const QWEN_REASONING_CONTROL_FIELDS = new Set([
    'reasoning',
    'reasoningEffort',
    'reasoning_effort'
]);

const QWEN_DASHSCOPE_HEADERS = {
    'X-DashScope-AuthType': 'qwen-oauth',
    'X-DashScope-CacheControl': 'enable'
};

class ThinkingBlockParser {
    private inThinkingBlock = false;
    private buffer = '';

    parse(text: string): { regular: string; thinking: string } {
        let regular = '';
        let thinking = '';
        this.buffer += text;

        while (true) {
            if (this.inThinkingBlock) {
                const endIdx = this.buffer.indexOf('</think>');
                if (endIdx !== -1) {
                    thinking += this.buffer.substring(0, endIdx);
                    this.buffer = this.buffer.substring(endIdx + 8);
                    this.inThinkingBlock = false;
                } else {
                    thinking += this.buffer;
                    this.buffer = '';
                    break;
                }
            } else {
                const startIdx = this.buffer.indexOf('<think>');
                if (startIdx !== -1) {
                    regular += this.buffer.substring(0, startIdx);
                    this.buffer = this.buffer.substring(startIdx + 7);
                    this.inThinkingBlock = true;
                } else {
                    regular += this.buffer;
                    this.buffer = '';
                    break;
                }
            }
        }
        return { regular, thinking };
    }
}

export class QwenCliProvider
    extends GenericModelProvider
    implements LanguageModelChatProvider
{
    private buildQwenModelConfig(
        modelConfig: ModelConfig,
        accessToken: string,
        baseUrl?: string
    ): ModelConfig {
        const normalizedModelId = (
            modelConfig.model || modelConfig.id
        ).toLowerCase();
        const outputCap = QWEN_MODEL_OUTPUT_LIMITS[normalizedModelId];
        const sanitizedExtraBody = modelConfig.extraBody
            ? Object.fromEntries(
                  Object.entries(modelConfig.extraBody).filter(
                      ([key]) => !QWEN_REASONING_CONTROL_FIELDS.has(key)
                  )
              )
            : undefined;

        const userAgent = getUserAgent();
        return {
            ...modelConfig,
            // Set apiKey so OpenAI handler uses it directly
            apiKey: accessToken,
            baseUrl: baseUrl || modelConfig.baseUrl || undefined,
            maxOutputTokens:
                typeof outputCap === 'number'
                    ? Math.min(modelConfig.maxOutputTokens, outputCap)
                    : modelConfig.maxOutputTokens,
            extraBody: sanitizedExtraBody,
            customHeader: {
                ...(modelConfig.customHeader || {}),
                ...QWEN_DASHSCOPE_HEADERS,
                'X-DashScope-UserAgent': userAgent,
                'User-Agent': userAgent
            }
        };
    }

    private isUnauthorizedError(error: unknown): boolean {
        if (!(error instanceof Error)) {
            return false;
        }
        const message = error.message.toLowerCase();
        return (
            message.includes(' 401') ||
            message.includes('status:401') ||
            message.includes('"code":401') ||
            message.includes('unauthorized') ||
            message.includes('invalid_api_key') ||
            message.includes('incorrect api key')
        );
    }

    private isInsufficientQuotaError(error: unknown): boolean {
        if (!(error instanceof Error)) {
            return false;
        }
        const message = error.message.toLowerCase();
        return (
            message.includes('insufficient_quota') ||
            (message.includes('429') && message.includes('quota')) ||
            message.includes('account quota exhausted')
        );
    }

    static override createAndActivate(
        context: vscode.ExtensionContext,
        providerKey: string,
        providerConfig: ProviderConfig
    ): { provider: QwenCliProvider; disposables: vscode.Disposable[] } {
        Logger.trace(`${providerConfig.displayName} provider activated!`);
        const provider = new QwenCliProvider(
            context,
            providerKey,
            providerConfig
        );
        const providerDisposable = vscode.lm.registerLanguageModelChatProvider(
            `chp.${providerKey}`,
            provider
        );

        const loginCommand = vscode.commands.registerCommand(
            `chp.${providerKey}.login`,
            async () => {
                const oauthManager = QwenOAuthManager.getInstance();

                // Check if credentials already exist
                try {
                    const existing = await oauthManager.getActiveOAuthAccount({
                        allowExhausted: true
                    });
                    if (existing?.accessToken) {
                        // Credentials exist, refresh and confirm
                        const { accessToken, baseURL, totalAccountCount } =
                            await oauthManager.ensureAuthenticated(true);
                        vscode.window.showInformationMessage(
                            `${providerConfig.displayName} already logged in! (${totalAccountCount} account${totalAccountCount === 1 ? '' : 's'})`
                        );
                        await provider.modelInfoCache?.invalidateCache(
                            providerKey
                        );
                        provider._onDidChangeLanguageModelChatInformation.fire();
                        return;
                    }
                } catch (_checkError) {
                    // No credentials, continue with OAuth flow
                    Logger.debug(
                        '[qwencli] No existing credentials, starting OAuth flow'
                    );
                }

                // Start OAuth device flow
                try {
                    const credentials = await oauthManager.startOAuthFlow();
                    if (credentials) {
                        const result =
                            await oauthManager.addOAuthAccount(credentials);
                        vscode.window.showInformationMessage(
                            `${providerConfig.displayName} login successful! (${result?.totalAccountCount || 1} account${(result?.totalAccountCount || 1) === 1 ? '' : 's'})`
                        );
                        await provider.modelInfoCache?.invalidateCache(
                            providerKey
                        );
                        provider._onDidChangeLanguageModelChatInformation.fire();
                    }
                } catch (error) {
                    // Fallback to legacy CLI authentication
                    Logger.warn(
                        '[qwencli] OAuth flow failed, trying legacy CLI',
                        error
                    );
                    try {
                        const { accessToken, baseURL, totalAccountCount } =
                            await oauthManager.ensureAuthenticated(true);
                        vscode.window.showInformationMessage(
                            `${providerConfig.displayName} login successful! (${totalAccountCount} account${totalAccountCount === 1 ? '' : 's'})`
                        );
                        await provider.modelInfoCache?.invalidateCache(
                            providerKey
                        );
                        provider._onDidChangeLanguageModelChatInformation.fire();
                    } catch (fallbackError) {
                        vscode.window.showErrorMessage(
                            `${providerConfig.displayName} login failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`
                        );
                    }
                }
            }
        );

        // Add command to add additional account
        const addAccountCommand = vscode.commands.registerCommand(
            `chp.${providerKey}.addAccount`,
            async () => {
                const oauthManager = QwenOAuthManager.getInstance();
                try {
                    const credentials = await oauthManager.startOAuthFlow();
                    if (credentials) {
                        const result =
                            await oauthManager.addOAuthAccount(credentials);
                        vscode.window.showInformationMessage(
                            `Added new Qwen account! Total: ${result?.totalAccountCount || '?'} account(s)`
                        );
                        await provider.modelInfoCache?.invalidateCache(
                            providerKey
                        );
                        provider._onDidChangeLanguageModelChatInformation.fire();
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `Failed to add account: ${error instanceof Error ? error.message : 'Unknown error'}`
                    );
                }
            }
        );

        const disposables = [
            providerDisposable,
            loginCommand,
            addAccountCommand
        ];
        for (const disposable of disposables) {
            context.subscriptions.push(disposable);
        }
        return { provider, disposables };
    }

    override async provideLanguageModelChatInformation(
        _options: { silent: boolean },
        _token: CancellationToken
    ): Promise<LanguageModelChatInformation[]> {
        // Always return models immediately without any async checks
        // This prevents the UI from refreshing/flickering when trying to add models
        // Authentication check will happen when user tries to use the model
        return this.providerConfig.models.map((model) =>
            this.modelConfigToInfo(model)
        );
    }

    override async provideLanguageModelChatResponse(
        model: LanguageModelChatInformation,
        messages: Array<LanguageModelChatMessage>,
        options: ProvideLanguageModelChatResponseOptions,
        progress: Progress<vscode.LanguageModelResponsePart2>,
        token: CancellationToken
    ): Promise<void> {
        const modelConfig = this.providerConfig.models.find(
            (m: ModelConfig) => m.id === model.id
        );
        if (!modelConfig) {
            throw new Error(`Model not found: ${model.id}`);
        }

        // Shared thinking/function-call parser used for all credential flows
        const thinkingParser = new ThinkingBlockParser();
        let currentThinkingId: string | null = null;
        let functionCallsBuffer = '';
        const hideThinkingInUI = ConfigManager.getHideThinkingInUI();
        const wrappedProgress: Progress<vscode.LanguageModelResponsePart2> = {
            report: (part) => {
                if (part instanceof vscode.LanguageModelTextPart) {
                    // First, parse thinking blocks
                    const { regular, thinking } = thinkingParser.parse(
                        part.value
                    );

                    if (thinking && !hideThinkingInUI) {
                        if (!currentThinkingId) {
                            currentThinkingId = `qwen_thinking_${Date.now()}`;
                        }
                        progress.report(
                            new vscode.LanguageModelThinkingPart(
                                thinking,
                                currentThinkingId
                            )
                        );
                    }

                    // Next, handle function_calls XML embedded in regular text
                    const textToHandle = functionCallsBuffer + (regular || '');
                    // Extract complete <function_calls>...</function_calls> blocks
                    const funcCallsRegex =
                        /<function_calls>[\s\S]*?<\/function_calls>/g;
                    let lastIdx = 0;
                    let fm = funcCallsRegex.exec(textToHandle);
                    while (fm !== null) {
                        const before = textToHandle.slice(lastIdx, fm.index);
                        if (before && before.length > 0) {
                            // End thinking if needed before reporting text
                            if (currentThinkingId) {
                                progress.report(
                                    new vscode.LanguageModelThinkingPart(
                                        '',
                                        currentThinkingId
                                    )
                                );
                                currentThinkingId = null;
                            }
                            progress.report(
                                new vscode.LanguageModelTextPart(before)
                            );
                        }

                        // Parse tool calls inside block
                        const block = fm[0];
                        const toolCallRegex =
                            /<tool_call\s+name="([^"]+)"\s+arguments='([^']*)'\s*\/>/g;
                        let tm = toolCallRegex.exec(block);
                        while (tm !== null) {
                            const name = tm[1];
                            const argsString = tm[2] || '';
                            let argsObj: Record<string, unknown> = {};
                            try {
                                argsObj = JSON.parse(argsString);
                            } catch {
                                argsObj = { value: argsString };
                            }
                            const callId = `qwen_call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                            // Make sure thinking is ended before tool call
                            if (currentThinkingId) {
                                progress.report(
                                    new vscode.LanguageModelThinkingPart(
                                        '',
                                        currentThinkingId
                                    )
                                );
                                currentThinkingId = null;
                            }
                            progress.report(
                                new vscode.LanguageModelToolCallPart(
                                    callId,
                                    name,
                                    argsObj
                                )
                            );
                            tm = toolCallRegex.exec(block);
                        }

                        lastIdx = funcCallsRegex.lastIndex;
                        fm = funcCallsRegex.exec(textToHandle);
                    }

                    const trailing = textToHandle.slice(lastIdx);
                    // If trailing contains start of a <function_calls> but no close, keep it buffered
                    const openStart = trailing.indexOf('<function_calls>');
                    const closeEnd = trailing.indexOf('</function_calls>');
                    if (openStart !== -1 && closeEnd === -1) {
                        // Emit text before openStart
                        const beforeOpen = trailing.slice(0, openStart);
                        if (beforeOpen && beforeOpen.length > 0) {
                            if (currentThinkingId) {
                                progress.report(
                                    new vscode.LanguageModelThinkingPart(
                                        '',
                                        currentThinkingId
                                    )
                                );
                                currentThinkingId = null;
                            }
                            progress.report(
                                new vscode.LanguageModelTextPart(beforeOpen)
                            );
                        }
                        functionCallsBuffer = trailing.slice(openStart);
                    } else {
                        functionCallsBuffer = '';
                        if (trailing && trailing.length > 0) {
                            if (currentThinkingId) {
                                progress.report(
                                    new vscode.LanguageModelThinkingPart(
                                        '',
                                        currentThinkingId
                                    )
                                );
                                currentThinkingId = null;
                            }
                            progress.report(
                                new vscode.LanguageModelTextPart(trailing)
                            );
                        }
                    }
                } else {
                    if (
                        hideThinkingInUI &&
                        part instanceof vscode.LanguageModelThinkingPart
                    ) {
                        return;
                    }
                    // Forward other parts unchanged
                    progress.report(part);
                }
            }
        };

        try {
            // Try to use managed accounts first (load balancing if configured)
            const accountManager = AccountManager.getInstance();
            const accounts = accountManager.getAccountsByProvider('qwencli');
            const loadBalanceEnabled =
                accountManager.getLoadBalanceEnabled('qwencli');
            const assignedAccountId = accountManager.getAccountIdForModel(
                'qwencli',
                model.id
            );

            // Helper to attempt using account credentials
            const tryAccountRequest = async (
                account: Account,
                accountAccessToken?: string
            ) => {
                if (!accountAccessToken) {
                    const creds = (await accountManager.getCredentials(
                        account.id
                    )) as AccountCredentials | undefined;
                    if (!creds) {
                        return { success: false, reason: 'no-creds' };
                    }
                    if ('accessToken' in creds) {
                        accountAccessToken = (creds as OAuthCredentials)
                            .accessToken;
                    } else if ('apiKey' in creds) {
                        accountAccessToken = (creds as ApiKeyCredentials)
                            .apiKey;
                    }
                    if (!accountAccessToken) {
                        return { success: false, reason: 'no-token' };
                    }
                }

                const configWithAuth = this.buildQwenModelConfig(
                    modelConfig,
                    accountAccessToken,
                    modelConfig.baseUrl || undefined
                );

                try {
                    await this.openaiHandler.handleRequest(
                        model,
                        configWithAuth,
                        messages,
                        options,
                        wrappedProgress,
                        token
                    );
                    return { success: true };
                } catch (err) {
                    return { success: false, error: err };
                }
            };

            // If there are managed accounts, attempt to use them with optional load balancing
            if (accounts && accounts.length > 0) {
                const usableAccounts = accounts.filter(
                    (a) => a.status === 'active'
                );
                const candidates =
                    usableAccounts.length > 0 ? usableAccounts : accounts;

                // If load balance is enabled, try multiple accounts, otherwise use active/default account
                const activeAccount =
                    accountManager.getActiveAccount('qwencli');
                let accountsToTry: Account[];
                if (loadBalanceEnabled) {
                    // Place assignedAccountId or activeAccount first
                    if (
                        activeAccount &&
                        candidates.some((a) => a.id === activeAccount.id)
                    ) {
                        accountsToTry = [
                            activeAccount,
                            ...candidates.filter(
                                (a) => a.id !== activeAccount.id
                            )
                        ];
                    } else {
                        accountsToTry = candidates;
                    }
                } else {
                    const assigned = assignedAccountId
                        ? accounts.find((a) => a.id === assignedAccountId)
                        : activeAccount;
                    accountsToTry = assigned
                        ? [assigned]
                        : candidates.length > 0
                          ? [candidates[0]]
                          : [];
                }

                let lastError: unknown;
                let switchedAccount = false;
                for (const account of accountsToTry) {
                    const result = await tryAccountRequest(account);
                    if (result.success) {
                        if (switchedAccount && loadBalanceEnabled) {
                            // Save preferred account mapping
                            accountManager
                                .setAccountForModel(
                                    'qwencli',
                                    model.id,
                                    account.id
                                )
                                .catch(() => {});
                        }
                        // success — continue normally
                        return;
                    }

                    lastError = result.error ?? result.reason;

                    // If 401, mark account expired and continue
                    if (this.isUnauthorizedError(result.error)) {
                        await accountManager.markAccountExpired(account.id);
                        switchedAccount = true;
                        continue;
                    }

                    if (
                        loadBalanceEnabled &&
                        this.isInsufficientQuotaError(result.error)
                    ) {
                        switchedAccount = true;
                        continue;
                    }

                    // Other errors -> rethrow
                    if (result.error) {
                        throw result.error;
                    }
                }

                if (lastError) {
                    // No managed account worked, fall back to CLI OAuth behavior below
                    Logger.warn(
                        '[qwencli] Managed accounts failed, falling back to CLI credentials',
                        lastError
                    );
                }
            }

            // Fallback: Ensure we read latest token (in case CLI updated credentials externally)
            const { accessToken, baseURL } =
                await QwenOAuthManager.getInstance().ensureAuthenticated();

            // Update handler with latest credentials (CLI)
            // Pass accessToken as apiKey so OpenAIHandler uses it for Authorization header
            const configWithAuth = this.buildQwenModelConfig(
                modelConfig,
                accessToken,
                baseURL
            );

            await this.openaiHandler.handleRequest(
                model,
                configWithAuth,
                messages,
                options,
                wrappedProgress,
                token
            );

            // success — continue normally
        } catch (error) {
            if (this.isInsufficientQuotaError(error)) {
                try {
                    const oauthManager = QwenOAuthManager.getInstance();
                    const active = await oauthManager.getActiveOAuthAccount({
                        allowExhausted: true
                    });
                    if (active?.accountId) {
                        await oauthManager.markOAuthAccountQuotaExhausted(
                            active.accountId,
                            'insufficient_quota'
                        );
                    }

                    const switched =
                        await oauthManager.switchToNextHealthyOAuthAccount(
                            active?.accountId ? [active.accountId] : []
                        );
                    if (switched?.accessToken) {
                        const switchedConfig = this.buildQwenModelConfig(
                            modelConfig,
                            switched.accessToken,
                            switched.baseURL
                        );
                        await this.openaiHandler.handleRequest(
                            model,
                            switchedConfig,
                            messages,
                            options,
                            wrappedProgress,
                            token
                        );
                        return;
                    }
                } catch (switchError) {
                    Logger.warn(
                        '[qwencli] Failed to switch OAuth account after insufficient_quota',
                        switchError
                    );
                }
            }

            // If we got a 401, invalidate cached credentials and retry once with fresh token
            if (this.isUnauthorizedError(error)) {
                QwenOAuthManager.getInstance().invalidateCredentials();
                const { accessToken, baseURL } =
                    await QwenOAuthManager.getInstance().ensureAuthenticated(
                        true
                    );
                const configWithAuth = this.buildQwenModelConfig(
                    modelConfig,
                    accessToken,
                    baseURL
                );
                await this.openaiHandler.handleRequest(
                    model,
                    configWithAuth,
                    messages,
                    options,
                    wrappedProgress,
                    token
                );
                return;
            }

            throw error;
        } finally {
            // Flush any remaining thinking content so the UI shows the thinking end marker
            try {
                const { regular, thinking } = thinkingParser.parse('');
                if (regular && regular.length > 0) {
                    progress.report(new vscode.LanguageModelTextPart(regular));
                }
                if (thinking && thinking.length > 0 && !hideThinkingInUI) {
                    if (!currentThinkingId) {
                        currentThinkingId = `qwen_thinking_${Date.now()}`;
                    }
                    progress.report(
                        new vscode.LanguageModelThinkingPart(
                            thinking,
                            currentThinkingId
                        )
                    );
                }
                if (currentThinkingId && !hideThinkingInUI) {
                    progress.report(
                        new vscode.LanguageModelThinkingPart(
                            '',
                            currentThinkingId
                        )
                    );
                }
            } catch (e) {
                Logger.trace(`[qwencli] Thinking flush failed: ${String(e)}`);
            }
        }
    }
}
