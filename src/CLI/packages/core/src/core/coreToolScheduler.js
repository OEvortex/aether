/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { NotificationType } from '../hooks/types.js';
import { createDebugLogger } from '../utils/debugLogger.js';
import { appendAdditionalContext, fireNotificationHook, firePermissionRequestHook, firePostToolUseFailureHook, firePostToolUseHook, firePreToolUseHook, generateToolUseId } from './toolHookTriggers.js';
const debugLogger = createDebugLogger('TOOL_SCHEDULER');
import * as Diff from 'diff';
import levenshtein from 'fast-levenshtein';
import { ApprovalMode, InputFormat, Kind, logToolCall, SkillTool, ToolCallEvent, ToolConfirmationOutcome, ToolErrorType } from '../index.js';
import { isModifiableDeclarativeTool, modifyWithEditor } from '../tools/modifiable-tool.js';
import { ShellToolInvocation } from '../tools/shell.js';
import { ToolNames } from '../tools/tool-names.js';
import { getResponseTextFromParts } from '../utils/generateContentResponseUtilities.js';
import { buildPermissionCheckContext, evaluatePermissionRules, injectPermissionRulesIfMissing, persistPermissionOutcome } from './permission-helpers.js';
import { getPlanModeSystemReminder } from './prompts.js';
const TRUNCATION_PARAM_GUIDANCE = 'Note: Your previous response was truncated due to max_tokens limit, ' +
    'which likely caused incomplete tool call parameters. ' +
    'Please retry the tool call with complete parameters. ' +
    'If the content is too large for a single response, ' +
    'consider splitting it into smaller parts.';
const TRUNCATION_EDIT_REJECTION = 'Your previous response was truncated due to max_tokens limit, ' +
    'which likely produced incomplete file content. ' +
    'The tool call has been rejected to prevent writing ' +
    'truncated content to the file. ' +
    'Please retry the tool call with complete content. ' +
    'If the content is too large for a single response, ' +
    'consider splitting it into smaller parts ' +
    '(e.g., write_file for initial content, then edit for additions).';
/**
 * Formats tool output for a Gemini FunctionResponse.
 */
function createFunctionResponsePart(callId, toolName, output, mediaParts) {
    const functionResponse = {
        id: callId,
        name: toolName,
        response: { output },
        ...(mediaParts && mediaParts.length > 0 ? { parts: mediaParts } : {})
    };
    return {
        functionResponse
    };
}
export function convertToFunctionResponse(toolName, callId, llmContent) {
    const contentToProcess = Array.isArray(llmContent) && llmContent.length === 1
        ? llmContent[0]
        : llmContent;
    if (typeof contentToProcess === 'string') {
        return [createFunctionResponsePart(callId, toolName, contentToProcess)];
    }
    if (Array.isArray(contentToProcess)) {
        // Extract text and media from all parts so that EVERYTHING is inside
        // the FunctionResponse.
        const textParts = [];
        const mediaParts = [];
        for (const part of toParts(contentToProcess)) {
            if (part.text !== undefined) {
                textParts.push(part.text);
            }
            else if (part.inlineData) {
                mediaParts.push({ inlineData: part.inlineData });
            }
            else if (part.fileData) {
                mediaParts.push({ fileData: part.fileData });
            }
            // Other exotic part types (e.g. functionCall) are intentionally
            // dropped here – they should not appear inside tool results.
        }
        const output = textParts.length > 0
            ? textParts.join('\n')
            : 'Tool execution succeeded.';
        return [
            createFunctionResponsePart(callId, toolName, output, mediaParts)
        ];
    }
    // After this point, contentToProcess is a single Part object.
    if (contentToProcess.functionResponse) {
        if (contentToProcess.functionResponse.response?.content) {
            const stringifiedOutput = getResponseTextFromParts(contentToProcess.functionResponse.response.content) || '';
            return [
                createFunctionResponsePart(callId, toolName, stringifiedOutput)
            ];
        }
        // It's a functionResponse that we should pass through as is.
        return [contentToProcess];
    }
    if (contentToProcess.inlineData || contentToProcess.fileData) {
        const mediaParts = [];
        if (contentToProcess.inlineData) {
            mediaParts.push({ inlineData: contentToProcess.inlineData });
        }
        if (contentToProcess.fileData) {
            mediaParts.push({ fileData: contentToProcess.fileData });
        }
        const functionResponse = createFunctionResponsePart(callId, toolName, '', mediaParts);
        return [functionResponse];
    }
    if (contentToProcess.text !== undefined) {
        return [
            createFunctionResponsePart(callId, toolName, contentToProcess.text)
        ];
    }
    // Default case for other kinds of parts.
    return [
        createFunctionResponsePart(callId, toolName, 'Tool execution succeeded.')
    ];
}
function toParts(input) {
    const parts = [];
    for (const part of Array.isArray(input) ? input : [input]) {
        if (typeof part === 'string') {
            parts.push({ text: part });
        }
        else if (part) {
            parts.push(part);
        }
    }
    return parts;
}
const createErrorResponse = (request, error, errorType) => ({
    callId: request.callId,
    error,
    responseParts: [
        {
            functionResponse: {
                id: request.callId,
                name: request.name,
                response: { error: error.message }
            }
        }
    ],
    resultDisplay: error.message,
    errorType,
    contentLength: error.message.length
});
export class CoreToolScheduler {
    toolRegistry;
    toolCalls = [];
    outputUpdateHandler;
    onAllToolCallsComplete;
    onToolCallsUpdate;
    getPreferredEditor;
    config;
    onEditorClose;
    chatRecordingService;
    isFinalizingToolCalls = false;
    isScheduling = false;
    requestQueue = [];
    constructor(options) {
        this.config = options.config;
        this.toolRegistry = options.config.getToolRegistry();
        this.outputUpdateHandler = options.outputUpdateHandler;
        this.onAllToolCallsComplete = options.onAllToolCallsComplete;
        this.onToolCallsUpdate = options.onToolCallsUpdate;
        this.getPreferredEditor = options.getPreferredEditor;
        this.onEditorClose = options.onEditorClose;
        this.chatRecordingService = options.chatRecordingService;
    }
    setStatusInternal(targetCallId, newStatus, auxiliaryData) {
        this.toolCalls = this.toolCalls.map((currentCall) => {
            if (currentCall.request.callId !== targetCallId ||
                currentCall.status === 'success' ||
                currentCall.status === 'error' ||
                currentCall.status === 'cancelled') {
                return currentCall;
            }
            // currentCall is a non-terminal state here and should have startTime and tool.
            const existingStartTime = currentCall.startTime;
            const toolInstance = currentCall.tool;
            const invocation = currentCall.invocation;
            const outcome = currentCall.outcome;
            switch (newStatus) {
                case 'success': {
                    const durationMs = existingStartTime
                        ? Date.now() - existingStartTime
                        : undefined;
                    return {
                        request: currentCall.request,
                        tool: toolInstance,
                        invocation,
                        status: 'success',
                        response: auxiliaryData,
                        durationMs,
                        outcome
                    };
                }
                case 'error': {
                    const durationMs = existingStartTime
                        ? Date.now() - existingStartTime
                        : undefined;
                    return {
                        request: currentCall.request,
                        status: 'error',
                        tool: toolInstance,
                        response: auxiliaryData,
                        durationMs,
                        outcome
                    };
                }
                case 'awaiting_approval':
                    return {
                        request: currentCall.request,
                        tool: toolInstance,
                        status: 'awaiting_approval',
                        confirmationDetails: auxiliaryData,
                        startTime: existingStartTime,
                        outcome,
                        invocation
                    };
                case 'scheduled':
                    return {
                        request: currentCall.request,
                        tool: toolInstance,
                        status: 'scheduled',
                        startTime: existingStartTime,
                        outcome,
                        invocation
                    };
                case 'cancelled': {
                    const durationMs = existingStartTime
                        ? Date.now() - existingStartTime
                        : undefined;
                    // Preserve diff for cancelled edit operations
                    // Preserve plan content for cancelled plan operations
                    let resultDisplay;
                    if (currentCall.status === 'awaiting_approval') {
                        const waitingCall = currentCall;
                        if (waitingCall.confirmationDetails.type === 'edit') {
                            resultDisplay = {
                                fileDiff: waitingCall.confirmationDetails.fileDiff,
                                fileName: waitingCall.confirmationDetails.fileName,
                                originalContent: waitingCall.confirmationDetails
                                    .originalContent,
                                newContent: waitingCall.confirmationDetails.newContent
                            };
                        }
                        else if (waitingCall.confirmationDetails.type === 'plan') {
                            resultDisplay = {
                                type: 'plan_summary',
                                message: 'Plan was rejected. Remaining in plan mode.',
                                plan: waitingCall.confirmationDetails.plan,
                                rejected: true
                            };
                        }
                    }
                    else if (currentCall.status === 'executing') {
                        // If the tool was streaming live output, preserve the latest
                        // output so the UI can continue to show it after cancellation.
                        const executingCall = currentCall;
                        if (executingCall.liveOutput !== undefined) {
                            resultDisplay = executingCall.liveOutput;
                        }
                    }
                    const errorMessage = `[Operation Cancelled] Reason: ${auxiliaryData}`;
                    return {
                        request: currentCall.request,
                        tool: toolInstance,
                        invocation,
                        status: 'cancelled',
                        response: {
                            callId: currentCall.request.callId,
                            responseParts: [
                                {
                                    functionResponse: {
                                        id: currentCall.request.callId,
                                        name: currentCall.request.name,
                                        response: {
                                            error: errorMessage
                                        }
                                    }
                                }
                            ],
                            resultDisplay,
                            error: undefined,
                            errorType: undefined,
                            contentLength: errorMessage.length
                        },
                        durationMs,
                        outcome
                    };
                }
                case 'validating':
                    return {
                        request: currentCall.request,
                        tool: toolInstance,
                        status: 'validating',
                        startTime: existingStartTime,
                        outcome,
                        invocation
                    };
                case 'executing':
                    return {
                        request: currentCall.request,
                        tool: toolInstance,
                        status: 'executing',
                        startTime: existingStartTime,
                        outcome,
                        invocation
                    };
                default: {
                    const exhaustiveCheck = newStatus;
                    return exhaustiveCheck;
                }
            }
        });
        this.notifyToolCallsUpdate();
        this.checkAndNotifyCompletion();
    }
    setArgsInternal(targetCallId, args) {
        this.toolCalls = this.toolCalls.map((call) => {
            // We should never be asked to set args on an ErroredToolCall, but
            // we guard for the case anyways.
            if (call.request.callId !== targetCallId ||
                call.status === 'error') {
                return call;
            }
            const invocationOrError = this.buildInvocation(call.tool, args);
            if (invocationOrError instanceof Error) {
                const response = createErrorResponse(call.request, invocationOrError, ToolErrorType.INVALID_TOOL_PARAMS);
                return {
                    request: {
                        ...call.request,
                        args: args
                    },
                    status: 'error',
                    tool: call.tool,
                    response
                };
            }
            return {
                ...call,
                request: {
                    ...call.request,
                    args: args
                },
                invocation: invocationOrError
            };
        });
    }
    isRunning() {
        return (this.isFinalizingToolCalls ||
            this.toolCalls.some((call) => call.status === 'executing' ||
                call.status === 'awaiting_approval'));
    }
    buildInvocation(tool, args) {
        try {
            return tool.build(args);
        }
        catch (e) {
            if (e instanceof Error) {
                return e;
            }
            return new Error(String(e));
        }
    }
    /**
     * Generates error message for unknown tool. Returns early with skill-specific
     * message if the name matches a skill, otherwise uses Levenshtein suggestions.
     */
    getToolNotFoundMessage(unknownToolName, topN = 3) {
        // Check if the unknown tool name matches an available skill name.
        // This handles the case where the model tries to invoke a skill as a tool
        // (e.g., Tool: "pdf" instead of Tool: "Skill" with skill: "pdf")
        const skillTool = this.toolRegistry.getTool(ToolNames.SKILL);
        if (skillTool instanceof SkillTool) {
            const availableSkillNames = skillTool.getAvailableSkillNames();
            if (availableSkillNames.includes(unknownToolName)) {
                return `"${unknownToolName}" is a skill name, not a tool name. To use this skill, invoke the "${ToolNames.SKILL}" tool with parameter: skill: "${unknownToolName}"`;
            }
        }
        // Standard "not found" message with Levenshtein suggestions
        const suggestion = this.getToolSuggestion(unknownToolName, topN);
        return `Tool "${unknownToolName}" not found in registry. Tools must use the exact names that are registered.${suggestion}`;
    }
    /** Suggests similar tool names using Levenshtein distance. */
    getToolSuggestion(unknownToolName, topN = 3) {
        const allToolNames = this.toolRegistry.getAllToolNames();
        const matches = allToolNames.map((toolName) => ({
            name: toolName,
            distance: levenshtein.get(unknownToolName, toolName)
        }));
        matches.sort((a, b) => a.distance - b.distance);
        const topNResults = matches.slice(0, topN);
        if (topNResults.length === 0) {
            return '';
        }
        const suggestedNames = topNResults
            .map((match) => `"${match.name}"`)
            .join(', ');
        if (topNResults.length > 1) {
            return ` Did you mean one of: ${suggestedNames}?`;
        }
        else {
            return ` Did you mean ${suggestedNames}?`;
        }
    }
    schedule(request, signal) {
        if (this.isRunning() || this.isScheduling) {
            return new Promise((resolve, reject) => {
                const abortHandler = () => {
                    // Find and remove the request from the queue
                    const index = this.requestQueue.findIndex((item) => item.request === request);
                    if (index > -1) {
                        this.requestQueue.splice(index, 1);
                        reject(new Error('Tool call cancelled while in queue.'));
                    }
                };
                signal.addEventListener('abort', abortHandler, { once: true });
                this.requestQueue.push({
                    request,
                    signal,
                    resolve: () => {
                        signal.removeEventListener('abort', abortHandler);
                        resolve();
                    },
                    reject: (reason) => {
                        signal.removeEventListener('abort', abortHandler);
                        reject(reason);
                    }
                });
            });
        }
        return this._schedule(request, signal);
    }
    async _schedule(request, signal) {
        this.isScheduling = true;
        try {
            if (this.isRunning()) {
                throw new Error('Cannot schedule new tool calls while other tool calls are actively running (executing or awaiting approval).');
            }
            const requestsToProcess = Array.isArray(request)
                ? request
                : [request];
            const newToolCalls = [];
            for (const reqInfo of requestsToProcess) {
                // Check if the tool is excluded due to permissions/environment restrictions
                // This check should happen before registry lookup to provide a clear permission error
                const pm = this.config.getPermissionManager?.();
                if (pm && !(await pm.isToolEnabled(reqInfo.name))) {
                    const matchingRule = pm.findMatchingDenyRule({
                        toolName: reqInfo.name
                    });
                    const ruleInfo = matchingRule
                        ? ` Matching deny rule: "${matchingRule}".`
                        : '';
                    const permissionErrorMessage = `Aether requires permission to use "${reqInfo.name}", but that permission was declined.${ruleInfo}`;
                    newToolCalls.push({
                        status: 'error',
                        request: reqInfo,
                        response: createErrorResponse(reqInfo, new Error(permissionErrorMessage), ToolErrorType.EXECUTION_DENIED),
                        durationMs: 0
                    });
                    continue;
                }
                // Legacy fallback: check getPermissionsDeny() when PM is not available
                if (!pm) {
                    const excludeTools = this.config.getPermissionsDeny?.() ?? undefined;
                    if (excludeTools && excludeTools.length > 0) {
                        const normalizedToolName = reqInfo.name
                            .toLowerCase()
                            .trim();
                        const excludedMatch = excludeTools.find((excludedTool) => excludedTool.toLowerCase().trim() ===
                            normalizedToolName);
                        if (excludedMatch) {
                            const permissionErrorMessage = `Aether requires permission to use ${excludedMatch}, but that permission was declined.`;
                            newToolCalls.push({
                                status: 'error',
                                request: reqInfo,
                                response: createErrorResponse(reqInfo, new Error(permissionErrorMessage), ToolErrorType.EXECUTION_DENIED),
                                durationMs: 0
                            });
                            continue;
                        }
                    }
                }
                const toolInstance = this.toolRegistry.getTool(reqInfo.name);
                if (!toolInstance) {
                    // Tool is not in registry and not excluded - likely hallucinated or typo
                    const errorMessage = this.getToolNotFoundMessage(reqInfo.name);
                    newToolCalls.push({
                        status: 'error',
                        request: reqInfo,
                        response: createErrorResponse(reqInfo, new Error(errorMessage), ToolErrorType.TOOL_NOT_REGISTERED),
                        durationMs: 0
                    });
                    continue;
                }
                const invocationOrError = this.buildInvocation(toolInstance, reqInfo.args);
                if (invocationOrError instanceof Error) {
                    const error = reqInfo.wasOutputTruncated
                        ? new Error(`${invocationOrError.message} ${TRUNCATION_PARAM_GUIDANCE}`)
                        : invocationOrError;
                    newToolCalls.push({
                        status: 'error',
                        request: reqInfo,
                        tool: toolInstance,
                        response: createErrorResponse(reqInfo, error, ToolErrorType.INVALID_TOOL_PARAMS),
                        durationMs: 0
                    });
                    continue;
                }
                // Reject file-modifying calls when truncated to prevent
                // writing incomplete content.
                if (reqInfo.wasOutputTruncated &&
                    toolInstance.kind === Kind.Edit) {
                    const truncationError = new Error(TRUNCATION_EDIT_REJECTION);
                    newToolCalls.push({
                        status: 'error',
                        request: reqInfo,
                        tool: toolInstance,
                        response: createErrorResponse(reqInfo, truncationError, ToolErrorType.OUTPUT_TRUNCATED),
                        durationMs: 0
                    });
                    continue;
                }
                newToolCalls.push({
                    status: 'validating',
                    request: reqInfo,
                    tool: toolInstance,
                    invocation: invocationOrError,
                    startTime: Date.now()
                });
            }
            this.toolCalls = this.toolCalls.concat(newToolCalls);
            this.notifyToolCallsUpdate();
            for (const toolCall of newToolCalls) {
                if (toolCall.status !== 'validating') {
                    continue;
                }
                const { request: reqInfo, invocation } = toolCall;
                try {
                    if (signal.aborted) {
                        this.setStatusInternal(reqInfo.callId, 'cancelled', 'Tool call cancelled by user.');
                        continue;
                    }
                    // =================================================================
                    // L3→L4→L5 Permission Flow
                    // =================================================================
                    // ---- L3: Tool's default permission ----
                    const defaultPermission = await invocation.getDefaultPermission();
                    // ---- L4: PermissionManager override (if relevant rules exist) ----
                    const pm = this.config.getPermissionManager?.();
                    const toolParams = invocation.params;
                    const pmCtx = buildPermissionCheckContext(reqInfo.name, toolParams, this.config.getTargetDir?.() ?? '');
                    const { finalPermission, pmForcedAsk } = await evaluatePermissionRules(pm, defaultPermission, pmCtx);
                    // ---- L5: Final decision based on permission + ApprovalMode ----
                    const approvalMode = this.config.getApprovalMode();
                    const isPlanMode = approvalMode === ApprovalMode.PLAN;
                    const isExitPlanModeTool = reqInfo.name === 'exit_plan_mode';
                    if (finalPermission === 'allow') {
                        // Auto-approve: tool is inherently safe (read-only) or PM allows
                        this.setToolCallOutcome(reqInfo.callId, ToolConfirmationOutcome.ProceedAlways);
                        this.setStatusInternal(reqInfo.callId, 'scheduled');
                        continue;
                    }
                    if (finalPermission === 'deny') {
                        // Hard deny: security violation or PM explicit deny
                        let denyMessage;
                        if (defaultPermission === 'deny') {
                            denyMessage = `Tool "${reqInfo.name}" is denied: command substitution is not allowed for security reasons.`;
                        }
                        else {
                            const matchingRule = pm?.findMatchingDenyRule(pmCtx);
                            const ruleInfo = matchingRule
                                ? ` Matching deny rule: "${matchingRule}".`
                                : '';
                            denyMessage = `Tool "${reqInfo.name}" is denied by permission rules.${ruleInfo}`;
                        }
                        this.setStatusInternal(reqInfo.callId, 'error', createErrorResponse(reqInfo, new Error(denyMessage), ToolErrorType.EXECUTION_DENIED));
                        continue;
                    }
                    // finalPermission === 'ask' (or 'default' from PM → treat as ask)
                    // apply ApprovalMode overrides.
                    // ask_user_question always needs confirmation so the user can answer;
                    // it must bypass both YOLO auto-approve and plan-mode blocking.
                    const isAskUserQuestionTool = reqInfo.name === ToolNames.ASK_USER_QUESTION;
                    let confirmationDetails;
                    if (approvalMode === ApprovalMode.YOLO &&
                        !isAskUserQuestionTool) {
                        this.setToolCallOutcome(reqInfo.callId, ToolConfirmationOutcome.ProceedAlways);
                        this.setStatusInternal(reqInfo.callId, 'scheduled');
                    }
                    else {
                        confirmationDetails =
                            await invocation.getConfirmationDetails(signal);
                        // ── Centralised rule injection ──────────────────────────────────
                        injectPermissionRulesIfMissing(confirmationDetails, pmCtx);
                        if (isPlanMode &&
                            !isExitPlanModeTool &&
                            !isAskUserQuestionTool &&
                            confirmationDetails.type !== 'info') {
                            this.setStatusInternal(reqInfo.callId, 'error', {
                                callId: reqInfo.callId,
                                responseParts: convertToFunctionResponse(reqInfo.name, reqInfo.callId, getPlanModeSystemReminder()),
                                resultDisplay: 'Plan mode blocked a non-read-only tool call.',
                                error: undefined,
                                errorType: undefined
                            });
                            continue;
                        }
                        // AUTO_EDIT mode: auto-approve edit-like and info tools
                        if (approvalMode === ApprovalMode.AUTO_EDIT &&
                            (confirmationDetails.type === 'edit' ||
                                confirmationDetails.type === 'info')) {
                            this.setToolCallOutcome(reqInfo.callId, ToolConfirmationOutcome.ProceedAlways);
                            this.setStatusInternal(reqInfo.callId, 'scheduled');
                            continue;
                        }
                        /**
                         * In non-interactive mode, automatically deny.
                         */
                        const shouldAutoDeny = !this.config.isInteractive() &&
                            !this.config.getExperimentalZedIntegration() &&
                            this.config.getInputFormat() !==
                                InputFormat.STREAM_JSON;
                        if (shouldAutoDeny) {
                            const errorMessage = `Aether requires permission to use "${reqInfo.name}", but that permission was declined (non-interactive mode cannot prompt for confirmation).`;
                            this.setStatusInternal(reqInfo.callId, 'error', createErrorResponse(reqInfo, new Error(errorMessage), ToolErrorType.EXECUTION_DENIED));
                            continue;
                        }
                        // Allow IDE to resolve confirmation
                        if (confirmationDetails.type === 'edit' &&
                            confirmationDetails.ideConfirmation) {
                            confirmationDetails.ideConfirmation.then((resolution) => {
                                // Guard: skip if the tool was already handled (e.g. by CLI
                                // confirmation).  Without this check, resolveDiffFromCli
                                // triggers this handler AND the CLI's onConfirm, causing a
                                // race where ProceedOnce overwrites ProceedAlways.
                                const still = this.toolCalls.find((c) => c.request.callId ===
                                    reqInfo.callId &&
                                    c.status === 'awaiting_approval');
                                if (!still) {
                                    return;
                                }
                                if (resolution.status === 'accepted' &&
                                    confirmationDetails?.onConfirm) {
                                    this.handleConfirmationResponse(reqInfo.callId, confirmationDetails.onConfirm, ToolConfirmationOutcome.ProceedOnce, signal);
                                }
                                else if (resolution.status === 'rejected' &&
                                    confirmationDetails?.onConfirm) {
                                    this.handleConfirmationResponse(reqInfo.callId, confirmationDetails.onConfirm, ToolConfirmationOutcome.Cancel, signal);
                                }
                            });
                        }
                        // Fire PermissionRequest hook before showing the permission dialog.
                        const messageBus = this.config.getMessageBus();
                        const hooksEnabled = !this.config.getDisableAllHooks();
                        if (hooksEnabled && messageBus) {
                            const permissionMode = String(this.config.getApprovalMode());
                            const hookResult = await firePermissionRequestHook(messageBus, reqInfo.name, reqInfo.args || {}, permissionMode);
                            if (hookResult.hasDecision) {
                                if (hookResult.shouldAllow) {
                                    // Hook granted permission - apply updated input if provided and proceed
                                    if (hookResult.updatedInput &&
                                        typeof reqInfo.args === 'object') {
                                        this.setArgsInternal(reqInfo.callId, hookResult.updatedInput);
                                    }
                                    await confirmationDetails.onConfirm(ToolConfirmationOutcome.ProceedOnce);
                                    this.setToolCallOutcome(reqInfo.callId, ToolConfirmationOutcome.ProceedOnce);
                                    this.setStatusInternal(reqInfo.callId, 'scheduled');
                                }
                                else {
                                    // Hook denied permission - cancel with optional message
                                    const cancelPayload = hookResult.denyMessage
                                        ? {
                                            cancelMessage: hookResult.denyMessage
                                        }
                                        : undefined;
                                    await confirmationDetails.onConfirm(ToolConfirmationOutcome.Cancel, cancelPayload);
                                    this.setToolCallOutcome(reqInfo.callId, ToolConfirmationOutcome.Cancel);
                                    this.setStatusInternal(reqInfo.callId, 'error', createErrorResponse(reqInfo, new Error(hookResult.denyMessage ||
                                        `Permission denied by hook for "${reqInfo.name}"`), ToolErrorType.EXECUTION_DENIED));
                                }
                                continue;
                            }
                        }
                        const originalOnConfirm = confirmationDetails.onConfirm;
                        const wrappedConfirmationDetails = {
                            ...confirmationDetails,
                            // When PM has an explicit 'ask' rule, 'always allow' would be
                            // ineffective because ask takes priority over allow.
                            // Hide the option so users aren't misled.
                            ...(pmForcedAsk
                                ? { hideAlwaysAllow: true }
                                : {}),
                            onConfirm: (outcome, payload) => this.handleConfirmationResponse(reqInfo.callId, originalOnConfirm, outcome, signal, payload)
                        };
                        this.setStatusInternal(reqInfo.callId, 'awaiting_approval', wrappedConfirmationDetails);
                        // Fire permission_prompt notification hook
                        if (hooksEnabled && messageBus) {
                            fireNotificationHook(messageBus, `Aether needs your permission to use ${reqInfo.name}`, NotificationType.PermissionPrompt, 'Permission needed').catch((error) => {
                                debugLogger.warn(`Permission prompt notification hook failed: ${error instanceof Error ? error.message : String(error)}`);
                            });
                        }
                    }
                }
                catch (error) {
                    if (signal.aborted) {
                        this.setStatusInternal(reqInfo.callId, 'cancelled', 'Tool call cancelled by user.');
                        continue;
                    }
                    this.setStatusInternal(reqInfo.callId, 'error', createErrorResponse(reqInfo, error instanceof Error
                        ? error
                        : new Error(String(error)), ToolErrorType.UNHANDLED_EXCEPTION));
                }
            }
            await this.attemptExecutionOfScheduledCalls(signal);
            void this.checkAndNotifyCompletion();
        }
        finally {
            this.isScheduling = false;
        }
    }
    async handleConfirmationResponse(callId, originalOnConfirm, outcome, signal, payload) {
        const toolCall = this.toolCalls.find((c) => c.request.callId === callId && c.status === 'awaiting_approval');
        // Guard: if the tool is no longer awaiting approval (already handled by
        // another confirmation path, e.g. IDE vs CLI race), skip to avoid double
        // processing and potential re-execution.
        if (!toolCall) {
            return;
        }
        await originalOnConfirm(outcome, payload);
        if (outcome === ToolConfirmationOutcome.ProceedAlways ||
            outcome === ToolConfirmationOutcome.ProceedAlwaysProject ||
            outcome === ToolConfirmationOutcome.ProceedAlwaysUser) {
            // Persist permission rules for Project/User scope outcomes
            await persistPermissionOutcome(outcome, toolCall.confirmationDetails, this.config.getOnPersistPermissionRule?.(), this.config.getPermissionManager?.(), payload);
            await this.autoApproveCompatiblePendingTools(signal, callId);
        }
        this.setToolCallOutcome(callId, outcome);
        if (outcome === ToolConfirmationOutcome.Cancel || signal.aborted) {
            // Use custom cancel message from payload if provided, otherwise use default
            const cancelMessage = payload?.cancelMessage || 'User did not allow tool call';
            this.setStatusInternal(callId, 'cancelled', cancelMessage);
        }
        else if (outcome === ToolConfirmationOutcome.ModifyWithEditor) {
            const waitingToolCall = toolCall;
            if (isModifiableDeclarativeTool(waitingToolCall.tool)) {
                const modifyContext = waitingToolCall.tool.getModifyContext(signal);
                const editorType = this.getPreferredEditor();
                if (!editorType) {
                    return;
                }
                this.setStatusInternal(callId, 'awaiting_approval', {
                    ...waitingToolCall.confirmationDetails,
                    isModifying: true
                });
                const { updatedParams, updatedDiff } = await modifyWithEditor(waitingToolCall.request.args, modifyContext, editorType, signal, this.onEditorClose);
                this.setArgsInternal(callId, updatedParams);
                this.setStatusInternal(callId, 'awaiting_approval', {
                    ...waitingToolCall.confirmationDetails,
                    fileDiff: updatedDiff,
                    isModifying: false
                });
            }
        }
        else {
            // If the client provided new content, apply it before scheduling.
            if (payload?.newContent && toolCall) {
                await this._applyInlineModify(toolCall, payload, signal);
            }
            this.setStatusInternal(callId, 'scheduled');
        }
        await this.attemptExecutionOfScheduledCalls(signal);
    }
    /**
     * Applies user-provided content changes to a tool call that is awaiting confirmation.
     * This method updates the tool's arguments and refreshes the confirmation prompt with a new diff
     * before the tool is scheduled for execution.
     * @private
     */
    async _applyInlineModify(toolCall, payload, signal) {
        if (toolCall.confirmationDetails.type !== 'edit' ||
            !isModifiableDeclarativeTool(toolCall.tool) ||
            !payload.newContent) {
            return;
        }
        const modifyContext = toolCall.tool.getModifyContext(signal);
        const currentContent = await modifyContext.getCurrentContent(toolCall.request.args);
        const updatedParams = modifyContext.createUpdatedParams(currentContent, payload.newContent, toolCall.request.args);
        const updatedDiff = Diff.createPatch(modifyContext.getFilePath(toolCall.request.args), currentContent, payload.newContent, 'Current', 'Proposed');
        this.setArgsInternal(toolCall.request.callId, updatedParams);
        this.setStatusInternal(toolCall.request.callId, 'awaiting_approval', {
            ...toolCall.confirmationDetails,
            fileDiff: updatedDiff
        });
    }
    async attemptExecutionOfScheduledCalls(signal) {
        const allCallsFinalOrScheduled = this.toolCalls.every((call) => call.status === 'scheduled' ||
            call.status === 'cancelled' ||
            call.status === 'success' ||
            call.status === 'error');
        if (allCallsFinalOrScheduled) {
            const callsToExecute = this.toolCalls.filter((call) => call.status === 'scheduled');
            // Task tools are safe to run concurrently — they spawn independent
            // sub-agents with no shared mutable state.  All other tools run
            // sequentially in their original order to preserve any implicit
            // ordering the model may rely on.
            const taskCalls = callsToExecute.filter((call) => call.request.name === ToolNames.AGENT);
            const otherCalls = callsToExecute.filter((call) => call.request.name !== ToolNames.AGENT);
            const taskPromise = Promise.all(taskCalls.map((tc) => this.executeSingleToolCall(tc, signal)));
            const othersPromise = (async () => {
                for (const toolCall of otherCalls) {
                    await this.executeSingleToolCall(toolCall, signal);
                }
            })();
            await Promise.all([taskPromise, othersPromise]);
        }
    }
    async executeSingleToolCall(toolCall, signal) {
        if (toolCall.status !== 'scheduled') {
            return;
        }
        const scheduledCall = toolCall;
        const { callId, name: toolName } = scheduledCall.request;
        const invocation = scheduledCall.invocation;
        const toolInput = scheduledCall.request.args;
        // Generate unique tool_use_id for hook tracking
        const toolUseId = generateToolUseId();
        // Get MessageBus for hook execution
        const messageBus = this.config.getMessageBus();
        const hooksEnabled = !this.config.getDisableAllHooks();
        // PreToolUse Hook
        if (hooksEnabled && messageBus) {
            // Convert ApprovalMode to permission_mode string for hooks
            const permissionMode = this.config.getApprovalMode();
            const preHookResult = await firePreToolUseHook(messageBus, toolName, toolInput, toolUseId, permissionMode);
            if (!preHookResult.shouldProceed) {
                // Hook blocked the execution
                const blockMessage = preHookResult.blockReason ||
                    'Tool execution blocked by hook';
                const errorResponse = createErrorResponse(scheduledCall.request, new Error(blockMessage), ToolErrorType.EXECUTION_DENIED);
                this.setStatusInternal(callId, 'error', errorResponse);
                return;
            }
        }
        this.setStatusInternal(callId, 'executing');
        const liveOutputCallback = scheduledCall.tool.canUpdateOutput
            ? (outputChunk) => {
                if (this.outputUpdateHandler) {
                    this.outputUpdateHandler(callId, outputChunk);
                }
                this.toolCalls = this.toolCalls.map((tc) => tc.request.callId === callId && tc.status === 'executing'
                    ? { ...tc, liveOutput: outputChunk }
                    : tc);
                this.notifyToolCallsUpdate();
            }
            : undefined;
        const shellExecutionConfig = this.config.getShellExecutionConfig();
        // TODO: Refactor to remove special casing for ShellToolInvocation.
        // Introduce a generic callbacks object for the execute method to handle
        // things like `onPid` and `onLiveOutput`. This will make the scheduler
        // agnostic to the invocation type.
        let promise;
        if (invocation instanceof ShellToolInvocation) {
            const setPidCallback = (pid) => {
                this.toolCalls = this.toolCalls.map((tc) => tc.request.callId === callId && tc.status === 'executing'
                    ? { ...tc, pid }
                    : tc);
                this.notifyToolCallsUpdate();
            };
            promise = invocation.execute(signal, liveOutputCallback, shellExecutionConfig, setPidCallback);
        }
        else {
            promise = invocation.execute(signal, liveOutputCallback, shellExecutionConfig);
        }
        try {
            const toolResult = await promise;
            if (signal.aborted) {
                // PostToolUseFailure Hook
                if (hooksEnabled && messageBus) {
                    const failureHookResult = await firePostToolUseFailureHook(messageBus, toolUseId, toolName, toolInput, 'User cancelled tool execution.', true, this.config.getApprovalMode());
                    // Append additional context from hook if provided
                    let cancelMessage = 'User cancelled tool execution.';
                    if (failureHookResult.additionalContext) {
                        cancelMessage += `\n\n${failureHookResult.additionalContext}`;
                    }
                    this.setStatusInternal(callId, 'cancelled', cancelMessage);
                }
                else {
                    this.setStatusInternal(callId, 'cancelled', 'User cancelled tool execution.');
                }
                return; // Both code paths should return here
            }
            if (toolResult.error === undefined) {
                let content = toolResult.llmContent;
                const contentLength = typeof content === 'string' ? content.length : undefined;
                // PostToolUse Hook
                if (hooksEnabled && messageBus) {
                    const toolResponse = {
                        llmContent: content,
                        returnDisplay: toolResult.returnDisplay
                    };
                    const permissionMode = this.config.getApprovalMode();
                    const postHookResult = await firePostToolUseHook(messageBus, toolName, toolInput, toolResponse, toolUseId, permissionMode);
                    // Append additional context from hook if provided
                    if (postHookResult.additionalContext) {
                        content = appendAdditionalContext(content, postHookResult.additionalContext);
                    }
                    // Check if hook requested to stop execution
                    if (postHookResult.shouldStop) {
                        const stopMessage = postHookResult.stopReason ||
                            'Execution stopped by hook';
                        const errorResponse = createErrorResponse(scheduledCall.request, new Error(stopMessage), ToolErrorType.EXECUTION_DENIED);
                        this.setStatusInternal(callId, 'error', errorResponse);
                        return;
                    }
                }
                const response = convertToFunctionResponse(toolName, callId, content);
                const successResponse = {
                    callId,
                    responseParts: response,
                    resultDisplay: toolResult.returnDisplay,
                    error: undefined,
                    errorType: undefined,
                    contentLength
                };
                this.setStatusInternal(callId, 'success', successResponse);
            }
            else {
                // It is a failure
                // PostToolUseFailure Hook
                let errorMessage = toolResult.error.message;
                if (hooksEnabled && messageBus) {
                    const failureHookResult = await firePostToolUseFailureHook(messageBus, toolUseId, toolName, toolInput, toolResult.error.message, false, this.config.getApprovalMode());
                    // Append additional context from hook if provided
                    if (failureHookResult.additionalContext) {
                        errorMessage += `\n\n${failureHookResult.additionalContext}`;
                    }
                }
                const error = new Error(errorMessage);
                const errorResponse = createErrorResponse(scheduledCall.request, error, toolResult.error.type);
                this.setStatusInternal(callId, 'error', errorResponse);
            }
        }
        catch (executionError) {
            const errorMessage = executionError instanceof Error
                ? executionError.message
                : String(executionError);
            if (signal.aborted) {
                // PostToolUseFailure Hook (user interrupt)
                if (hooksEnabled && messageBus) {
                    const failureHookResult = await firePostToolUseFailureHook(messageBus, toolUseId, toolName, toolInput, 'User cancelled tool execution.', true, this.config.getApprovalMode());
                    // Append additional context from hook if provided
                    let cancelMessage = 'User cancelled tool execution.';
                    if (failureHookResult.additionalContext) {
                        cancelMessage += `\n\n${failureHookResult.additionalContext}`;
                    }
                    this.setStatusInternal(callId, 'cancelled', cancelMessage);
                }
                else {
                    this.setStatusInternal(callId, 'cancelled', 'User cancelled tool execution.');
                }
                return;
            }
            else {
                // PostToolUseFailure Hook
                let exceptionErrorMessage = errorMessage;
                if (hooksEnabled && messageBus) {
                    const failureHookResult = await firePostToolUseFailureHook(messageBus, toolUseId, toolName, toolInput, errorMessage, false, this.config.getApprovalMode());
                    // Append additional context from hook if provided
                    if (failureHookResult.additionalContext) {
                        exceptionErrorMessage += `\n\n${failureHookResult.additionalContext}`;
                    }
                }
                this.setStatusInternal(callId, 'error', createErrorResponse(scheduledCall.request, executionError instanceof Error
                    ? new Error(exceptionErrorMessage)
                    : new Error(String(executionError)), ToolErrorType.UNHANDLED_EXCEPTION));
            }
        }
    }
    async checkAndNotifyCompletion() {
        const allCallsAreTerminal = this.toolCalls.every((call) => call.status === 'success' ||
            call.status === 'error' ||
            call.status === 'cancelled');
        if (this.toolCalls.length > 0 && allCallsAreTerminal) {
            const completedCalls = [...this.toolCalls];
            this.toolCalls = [];
            for (const call of completedCalls) {
                logToolCall(this.config, new ToolCallEvent(call));
            }
            // Record tool results before notifying completion
            this.recordToolResults(completedCalls);
            if (this.onAllToolCallsComplete) {
                this.isFinalizingToolCalls = true;
                await this.onAllToolCallsComplete(completedCalls);
                this.isFinalizingToolCalls = false;
            }
            this.notifyToolCallsUpdate();
            // After completion, process the next item in the queue.
            if (this.requestQueue.length > 0) {
                const next = this.requestQueue.shift();
                this._schedule(next.request, next.signal)
                    .then(next.resolve)
                    .catch(next.reject);
            }
        }
    }
    /**
     * Records tool results to the chat recording service.
     * This captures both the raw Content (for API reconstruction) and
     * enriched metadata (for UI recovery).
     */
    recordToolResults(completedCalls) {
        if (!this.chatRecordingService) {
            return;
        }
        // Collect all response parts from completed calls
        const responseParts = completedCalls.flatMap((call) => call.response.responseParts);
        if (responseParts.length === 0) {
            return;
        }
        // Record each tool result individually
        for (const call of completedCalls) {
            this.chatRecordingService.recordToolResult(call.response.responseParts, {
                callId: call.request.callId,
                status: call.status,
                resultDisplay: call.response.resultDisplay,
                error: call.response.error,
                errorType: call.response.errorType
            });
        }
    }
    notifyToolCallsUpdate() {
        if (this.onToolCallsUpdate) {
            this.onToolCallsUpdate([...this.toolCalls]);
        }
    }
    setToolCallOutcome(callId, outcome) {
        this.toolCalls = this.toolCalls.map((call) => {
            if (call.request.callId !== callId) {
                return call;
            }
            return {
                ...call,
                outcome
            };
        });
    }
    async autoApproveCompatiblePendingTools(_signal, triggeringCallId) {
        const pendingTools = this.toolCalls.filter((call) => call.status === 'awaiting_approval' &&
            call.request.callId !== triggeringCallId);
        for (const pendingTool of pendingTools) {
            try {
                // Re-run L3→L4 to see if the tool can now be auto-approved
                const defaultPermission = await pendingTool.invocation.getDefaultPermission();
                const toolParams = pendingTool.invocation.params;
                const pmCtx = buildPermissionCheckContext(pendingTool.request.name, toolParams, this.config.getTargetDir?.() ?? '');
                const { finalPermission } = await evaluatePermissionRules(this.config.getPermissionManager?.(), defaultPermission, pmCtx);
                if (finalPermission === 'allow') {
                    this.setToolCallOutcome(pendingTool.request.callId, ToolConfirmationOutcome.ProceedAlways);
                    this.setStatusInternal(pendingTool.request.callId, 'scheduled');
                }
            }
            catch (error) {
                debugLogger.error(`Error checking confirmation for tool ${pendingTool.request.callId}:`, error);
            }
        }
    }
}
//# sourceMappingURL=coreToolScheduler.js.map