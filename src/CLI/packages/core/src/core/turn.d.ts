/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { FinishReason, type FunctionDeclaration, type GenerateContentResponse, type GenerateContentResponseUsageMetadata, type Part, type PartListUnion } from '@google/genai';
import type { ToolErrorType } from '../tools/tool-error.js';
import type { ToolCallConfirmationDetails, ToolResult, ToolResultDisplay } from '../tools/tools.js';
import type { RetryInfo } from '../utils/rateLimit.js';
import { type ThoughtSummary } from '../utils/thoughtUtils.js';
import type { GeminiChat } from './geminiChat.js';
export interface ServerTool {
    name: string;
    schema: FunctionDeclaration;
    execute(params: Record<string, unknown>, signal?: AbortSignal): Promise<ToolResult>;
}
export declare enum GeminiEventType {
    Content = "content",
    ToolCallRequest = "tool_call_request",
    ToolCallResponse = "tool_call_response",
    ToolCallConfirmation = "tool_call_confirmation",
    UserCancelled = "user_cancelled",
    Error = "error",
    ChatCompressed = "chat_compressed",
    Thought = "thought",
    MaxSessionTurns = "max_session_turns",
    SessionTokenLimitExceeded = "session_token_limit_exceeded",
    Finished = "finished",
    LoopDetected = "loop_detected",
    Citation = "citation",
    Retry = "retry",
    HookSystemMessage = "hook_system_message",
    UserPromptSubmitBlocked = "user_prompt_submit_blocked",
    StopHookLoop = "stop_hook_loop"
}
export type ServerGeminiRetryEvent = {
    type: GeminiEventType.Retry;
    retryInfo?: RetryInfo;
};
export interface StructuredError {
    message: string;
    status?: number;
}
export interface GeminiErrorEventValue {
    error: StructuredError;
}
export interface SessionTokenLimitExceededValue {
    currentTokens: number;
    limit: number;
    message: string;
}
export interface GeminiFinishedEventValue {
    reason: FinishReason | undefined;
    usageMetadata: GenerateContentResponseUsageMetadata | undefined;
}
export interface ToolCallRequestInfo {
    callId: string;
    name: string;
    args: Record<string, unknown>;
    isClientInitiated: boolean;
    prompt_id: string;
    response_id?: string;
    /** Set to true when the LLM response was truncated due to max_tokens. */
    wasOutputTruncated?: boolean;
}
export interface ToolCallResponseInfo {
    callId: string;
    responseParts: Part[];
    resultDisplay: ToolResultDisplay | undefined;
    error: Error | undefined;
    errorType: ToolErrorType | undefined;
    contentLength?: number;
}
export interface ServerToolCallConfirmationDetails {
    request: ToolCallRequestInfo;
    details: ToolCallConfirmationDetails;
}
export type ServerGeminiContentEvent = {
    type: GeminiEventType.Content;
    value: string;
};
export type ServerGeminiThoughtEvent = {
    type: GeminiEventType.Thought;
    value: ThoughtSummary;
};
export type ServerGeminiToolCallRequestEvent = {
    type: GeminiEventType.ToolCallRequest;
    value: ToolCallRequestInfo;
};
export type ServerGeminiToolCallResponseEvent = {
    type: GeminiEventType.ToolCallResponse;
    value: ToolCallResponseInfo;
};
export type ServerGeminiToolCallConfirmationEvent = {
    type: GeminiEventType.ToolCallConfirmation;
    value: ServerToolCallConfirmationDetails;
};
export type ServerGeminiUserCancelledEvent = {
    type: GeminiEventType.UserCancelled;
};
export type ServerGeminiErrorEvent = {
    type: GeminiEventType.Error;
    value: GeminiErrorEventValue;
};
export declare enum CompressionStatus {
    /** The compression was successful */
    COMPRESSED = 1,
    /** The compression failed due to the compression inflating the token count */
    COMPRESSION_FAILED_INFLATED_TOKEN_COUNT = 2,
    /** The compression failed due to an error counting tokens */
    COMPRESSION_FAILED_TOKEN_COUNT_ERROR = 3,
    /** The compression failed due to receiving an empty or null summary */
    COMPRESSION_FAILED_EMPTY_SUMMARY = 4,
    /** The compression was not necessary and no action was taken */
    NOOP = 5
}
export interface ChatCompressionInfo {
    originalTokenCount: number;
    newTokenCount: number;
    compressionStatus: CompressionStatus;
}
export type ServerGeminiChatCompressedEvent = {
    type: GeminiEventType.ChatCompressed;
    value: ChatCompressionInfo | null;
};
export type ServerGeminiMaxSessionTurnsEvent = {
    type: GeminiEventType.MaxSessionTurns;
};
export type ServerGeminiSessionTokenLimitExceededEvent = {
    type: GeminiEventType.SessionTokenLimitExceeded;
    value: SessionTokenLimitExceededValue;
};
export type ServerGeminiFinishedEvent = {
    type: GeminiEventType.Finished;
    value: GeminiFinishedEventValue;
};
export type ServerGeminiLoopDetectedEvent = {
    type: GeminiEventType.LoopDetected;
};
export type ServerGeminiCitationEvent = {
    type: GeminiEventType.Citation;
    value: string;
};
export type ServerGeminiHookSystemMessageEvent = {
    type: GeminiEventType.HookSystemMessage;
    value: string;
};
export type ServerGeminiUserPromptSubmitBlockedEvent = {
    type: GeminiEventType.UserPromptSubmitBlocked;
    value: {
        reason: string;
        originalPrompt: string;
    };
};
export type ServerGeminiStopHookLoopEvent = {
    type: GeminiEventType.StopHookLoop;
    value: {
        iterationCount: number;
        reasons: string[];
        stopHookCount: number;
    };
};
export type ServerGeminiStreamEvent = ServerGeminiChatCompressedEvent | ServerGeminiCitationEvent | ServerGeminiContentEvent | ServerGeminiErrorEvent | ServerGeminiFinishedEvent | ServerGeminiHookSystemMessageEvent | ServerGeminiUserPromptSubmitBlockedEvent | ServerGeminiStopHookLoopEvent | ServerGeminiLoopDetectedEvent | ServerGeminiMaxSessionTurnsEvent | ServerGeminiThoughtEvent | ServerGeminiToolCallConfirmationEvent | ServerGeminiToolCallRequestEvent | ServerGeminiToolCallResponseEvent | ServerGeminiUserCancelledEvent | ServerGeminiSessionTokenLimitExceededEvent | ServerGeminiRetryEvent;
export declare class Turn {
    private readonly chat;
    private readonly prompt_id;
    readonly pendingToolCalls: ToolCallRequestInfo[];
    private debugResponses;
    private pendingCitations;
    finishReason: FinishReason | undefined;
    private currentResponseId?;
    constructor(chat: GeminiChat, prompt_id: string);
    run(model: string, req: PartListUnion, signal: AbortSignal): AsyncGenerator<ServerGeminiStreamEvent>;
    private handlePendingFunctionCall;
    getDebugResponses(): GenerateContentResponse[];
}
