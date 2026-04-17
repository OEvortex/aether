/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { AnyDeclarativeTool, AnyToolInvocation, ChatRecordingService, Config, EditorType, ToolCallConfirmationDetails, ToolCallRequestInfo, ToolCallResponseInfo, ToolConfirmationPayload, ToolResultDisplay } from '../index.js';
import type { Part, PartListUnion } from '@google/genai';
import { ToolConfirmationOutcome } from '../index.js';
export type ValidatingToolCall = {
    status: 'validating';
    request: ToolCallRequestInfo;
    tool: AnyDeclarativeTool;
    invocation: AnyToolInvocation;
    startTime?: number;
    outcome?: ToolConfirmationOutcome;
};
export type ScheduledToolCall = {
    status: 'scheduled';
    request: ToolCallRequestInfo;
    tool: AnyDeclarativeTool;
    invocation: AnyToolInvocation;
    startTime?: number;
    outcome?: ToolConfirmationOutcome;
};
export type ErroredToolCall = {
    status: 'error';
    request: ToolCallRequestInfo;
    response: ToolCallResponseInfo;
    tool?: AnyDeclarativeTool;
    durationMs?: number;
    outcome?: ToolConfirmationOutcome;
};
export type SuccessfulToolCall = {
    status: 'success';
    request: ToolCallRequestInfo;
    tool: AnyDeclarativeTool;
    response: ToolCallResponseInfo;
    invocation: AnyToolInvocation;
    durationMs?: number;
    outcome?: ToolConfirmationOutcome;
};
export type ExecutingToolCall = {
    status: 'executing';
    request: ToolCallRequestInfo;
    tool: AnyDeclarativeTool;
    invocation: AnyToolInvocation;
    liveOutput?: ToolResultDisplay;
    startTime?: number;
    outcome?: ToolConfirmationOutcome;
    pid?: number;
};
export type CancelledToolCall = {
    status: 'cancelled';
    request: ToolCallRequestInfo;
    response: ToolCallResponseInfo;
    tool: AnyDeclarativeTool;
    invocation: AnyToolInvocation;
    durationMs?: number;
    outcome?: ToolConfirmationOutcome;
};
export type WaitingToolCall = {
    status: 'awaiting_approval';
    request: ToolCallRequestInfo;
    tool: AnyDeclarativeTool;
    invocation: AnyToolInvocation;
    confirmationDetails: ToolCallConfirmationDetails;
    startTime?: number;
    outcome?: ToolConfirmationOutcome;
};
export type Status = ToolCall['status'];
export type ToolCall = ValidatingToolCall | ScheduledToolCall | ErroredToolCall | SuccessfulToolCall | ExecutingToolCall | CancelledToolCall | WaitingToolCall;
export type CompletedToolCall = SuccessfulToolCall | CancelledToolCall | ErroredToolCall;
export type ConfirmHandler = (toolCall: WaitingToolCall) => Promise<ToolConfirmationOutcome>;
export type OutputUpdateHandler = (toolCallId: string, outputChunk: ToolResultDisplay) => void;
export type AllToolCallsCompleteHandler = (completedToolCalls: CompletedToolCall[]) => Promise<void>;
export type ToolCallsUpdateHandler = (toolCalls: ToolCall[]) => void;
export declare function convertToFunctionResponse(toolName: string, callId: string, llmContent: PartListUnion): Part[];
interface CoreToolSchedulerOptions {
    config: Config;
    outputUpdateHandler?: OutputUpdateHandler;
    onAllToolCallsComplete?: AllToolCallsCompleteHandler;
    onToolCallsUpdate?: ToolCallsUpdateHandler;
    getPreferredEditor: () => EditorType | undefined;
    onEditorClose: () => void;
    /**
     * Optional recording service. If provided, tool results will be recorded.
     */
    chatRecordingService?: ChatRecordingService;
}
export declare class CoreToolScheduler {
    private toolRegistry;
    private toolCalls;
    private outputUpdateHandler?;
    private onAllToolCallsComplete?;
    private onToolCallsUpdate?;
    private getPreferredEditor;
    private config;
    private onEditorClose;
    private chatRecordingService?;
    private isFinalizingToolCalls;
    private isScheduling;
    private requestQueue;
    constructor(options: CoreToolSchedulerOptions);
    private setStatusInternal;
    private setArgsInternal;
    private isRunning;
    private buildInvocation;
    /**
     * Generates error message for unknown tool. Returns early with skill-specific
     * message if the name matches a skill, otherwise uses Levenshtein suggestions.
     */
    private getToolNotFoundMessage;
    /** Suggests similar tool names using Levenshtein distance. */
    private getToolSuggestion;
    schedule(request: ToolCallRequestInfo | ToolCallRequestInfo[], signal: AbortSignal): Promise<void>;
    private _schedule;
    handleConfirmationResponse(callId: string, originalOnConfirm: (outcome: ToolConfirmationOutcome, payload?: ToolConfirmationPayload) => Promise<void>, outcome: ToolConfirmationOutcome, signal: AbortSignal, payload?: ToolConfirmationPayload): Promise<void>;
    /**
     * Applies user-provided content changes to a tool call that is awaiting confirmation.
     * This method updates the tool's arguments and refreshes the confirmation prompt with a new diff
     * before the tool is scheduled for execution.
     * @private
     */
    private _applyInlineModify;
    private attemptExecutionOfScheduledCalls;
    private executeSingleToolCall;
    private checkAndNotifyCompletion;
    /**
     * Records tool results to the chat recording service.
     * This captures both the raw Content (for API reconstruction) and
     * enriched metadata (for UI recovery).
     */
    private recordToolResults;
    private notifyToolCallsUpdate;
    private setToolCallOutcome;
    private autoApproveCompatiblePendingTools;
}
export {};
