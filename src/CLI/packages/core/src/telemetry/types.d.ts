/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { GenerateContentResponseUsageMetadata } from '@google/genai';
import type { ApprovalMode, Config } from '../config/config.js';
import type { AuthType } from '../core/contentGenerator.js';
import type { CompletedToolCall } from '../core/coreToolScheduler.js';
import type { FileOperation } from './metrics.js';
import { ToolCallDecision } from './tool-call-decision.js';
export { ToolCallDecision };
import type { OutputFormat } from '../output/types.js';
export interface BaseTelemetryEvent {
    'event.name': string;
    /** Current timestamp in ISO 8601 format */
    'event.timestamp': string;
}
type CommonFields = keyof BaseTelemetryEvent;
export declare class StartSessionEvent implements BaseTelemetryEvent {
    'event.name': 'cli_config';
    'event.timestamp': string;
    session_id: string;
    model: string;
    sandbox_enabled: boolean;
    core_tools_enabled?: string;
    approval_mode: string;
    debug_enabled: boolean;
    truncate_tool_output_threshold: number;
    truncate_tool_output_lines: number;
    mcp_servers: string;
    telemetry_enabled: boolean;
    file_filtering_respect_git_ignore: boolean;
    mcp_servers_count: number;
    mcp_tools_count?: number;
    mcp_tools?: string;
    output_format: OutputFormat;
    hooks?: string;
    ide_enabled: boolean;
    interactive_shell_enabled: boolean;
    skills?: string;
    subagents?: string;
    constructor(config: Config);
}
export declare class EndSessionEvent implements BaseTelemetryEvent {
    'event.name': 'end_session';
    'event.timestamp': string;
    session_id?: string;
    constructor(config?: Config);
}
export declare class UserPromptEvent implements BaseTelemetryEvent {
    'event.name': 'user_prompt';
    'event.timestamp': string;
    prompt_length: number;
    prompt_id: string;
    auth_type?: string;
    prompt?: string;
    constructor(prompt_length: number, prompt_Id: string, auth_type?: string, prompt?: string);
}
export declare class UserRetryEvent implements BaseTelemetryEvent {
    'event.name': 'user_retry';
    'event.timestamp': string;
    prompt_id: string;
    constructor(prompt_id: string);
}
export declare class ToolCallEvent implements BaseTelemetryEvent {
    'event.name': 'tool_call';
    'event.timestamp': string;
    function_name: string;
    function_args: Record<string, unknown>;
    duration_ms: number;
    status: 'success' | 'error' | 'cancelled';
    success: boolean;
    decision?: ToolCallDecision;
    error?: string;
    error_type?: string;
    prompt_id: string;
    response_id?: string;
    tool_type: 'native' | 'mcp';
    content_length?: number;
    mcp_server_name?: string;
    metadata?: {
        [key: string]: any;
    };
    constructor(call: CompletedToolCall);
}
export declare class ApiRequestEvent implements BaseTelemetryEvent {
    'event.name': 'api_request';
    'event.timestamp': string;
    model: string;
    prompt_id: string;
    request_text?: string;
    constructor(model: string, prompt_id: string, request_text?: string);
}
export declare class ApiErrorEvent implements BaseTelemetryEvent {
    'event.name': 'api_error';
    'event.timestamp': string;
    response_id?: string;
    model: string;
    duration_ms: number;
    prompt_id: string;
    auth_type?: string;
    error_message: string;
    error_type?: string;
    status_code?: number | string;
    constructor(opts: {
        responseId?: string;
        model: string;
        durationMs: number;
        promptId: string;
        authType?: string;
        errorMessage: string;
        errorType?: string;
        statusCode?: number | string;
    });
}
export declare class ApiCancelEvent implements BaseTelemetryEvent {
    'event.name': 'api_cancel';
    'event.timestamp': string;
    model: string;
    prompt_id: string;
    auth_type?: string;
    constructor(model: string, prompt_id: string, auth_type?: string);
}
export declare class ApiResponseEvent implements BaseTelemetryEvent {
    'event.name': 'api_response';
    'event.timestamp': string;
    response_id: string;
    model: string;
    status_code?: number | string;
    duration_ms: number;
    input_token_count: number;
    output_token_count: number;
    cached_content_token_count: number;
    thoughts_token_count: number;
    tool_token_count: number;
    total_token_count: number;
    response_text?: string;
    prompt_id: string;
    auth_type?: string;
    constructor(response_id: string, model: string, duration_ms: number, prompt_id: string, auth_type?: string, usage_data?: GenerateContentResponseUsageMetadata, response_text?: string);
}
export declare class FlashFallbackEvent implements BaseTelemetryEvent {
    'event.name': 'flash_fallback';
    'event.timestamp': string;
    auth_type: string;
    constructor(auth_type: string);
}
export declare class RipgrepFallbackEvent implements BaseTelemetryEvent {
    'event.name': 'ripgrep_fallback';
    'event.timestamp': string;
    use_ripgrep: boolean;
    use_builtin_ripgrep: boolean;
    error?: string;
    constructor(use_ripgrep: boolean, use_builtin_ripgrep: boolean, error?: string);
}
export declare enum LoopType {
    CONSECUTIVE_IDENTICAL_TOOL_CALLS = "consecutive_identical_tool_calls",
    CHANTING_IDENTICAL_SENTENCES = "chanting_identical_sentences"
}
export declare class LoopDetectedEvent implements BaseTelemetryEvent {
    'event.name': 'loop_detected';
    'event.timestamp': string;
    loop_type: LoopType;
    prompt_id: string;
    constructor(loop_type: LoopType, prompt_id: string);
}
export declare class LoopDetectionDisabledEvent implements BaseTelemetryEvent {
    'event.name': 'loop_detection_disabled';
    'event.timestamp': string;
    prompt_id: string;
    constructor(prompt_id: string);
}
export declare class NextSpeakerCheckEvent implements BaseTelemetryEvent {
    'event.name': 'next_speaker_check';
    'event.timestamp': string;
    prompt_id: string;
    finish_reason: string;
    result: string;
    constructor(prompt_id: string, finish_reason: string, result: string);
}
export interface SlashCommandEvent extends BaseTelemetryEvent {
    'event.name': 'slash_command';
    'event.timestamp': string;
    command: string;
    subcommand?: string;
    status?: SlashCommandStatus;
}
export declare function makeSlashCommandEvent({ command, subcommand, status }: Omit<SlashCommandEvent, CommonFields>): SlashCommandEvent;
export declare enum SlashCommandStatus {
    SUCCESS = "success",
    ERROR = "error"
}
export interface ChatCompressionEvent extends BaseTelemetryEvent {
    'event.name': 'chat_compression';
    'event.timestamp': string;
    tokens_before: number;
    tokens_after: number;
    compression_input_token_count?: number;
    compression_output_token_count?: number;
}
export declare function makeChatCompressionEvent({ tokens_before, tokens_after, compression_input_token_count, compression_output_token_count }: Omit<ChatCompressionEvent, CommonFields>): ChatCompressionEvent;
export declare class MalformedJsonResponseEvent implements BaseTelemetryEvent {
    'event.name': 'malformed_json_response';
    'event.timestamp': string;
    model: string;
    constructor(model: string);
}
export declare enum IdeConnectionType {
    START = "start",
    SESSION = "session"
}
export declare class IdeConnectionEvent {
    'event.name': 'ide_connection';
    'event.timestamp': string;
    connection_type: IdeConnectionType;
    constructor(connection_type: IdeConnectionType);
}
export declare class ConversationFinishedEvent {
    event_name: 'conversation_finished';
    'event.timestamp': string;
    approvalMode: ApprovalMode;
    turnCount: number;
    constructor(approvalMode: ApprovalMode, turnCount: number);
}
export declare class KittySequenceOverflowEvent {
    'event.name': 'kitty_sequence_overflow';
    'event.timestamp': string;
    sequence_length: number;
    truncated_sequence: string;
    constructor(sequence_length: number, truncated_sequence: string);
}
export declare class FileOperationEvent implements BaseTelemetryEvent {
    'event.name': 'file_operation';
    'event.timestamp': string;
    tool_name: string;
    operation: FileOperation;
    lines?: number;
    mimetype?: string;
    extension?: string;
    programming_language?: string;
    constructor(tool_name: string, operation: FileOperation, lines?: number, mimetype?: string, extension?: string, programming_language?: string);
}
export declare class InvalidChunkEvent implements BaseTelemetryEvent {
    'event.name': 'invalid_chunk';
    'event.timestamp': string;
    error_message?: string;
    constructor(error_message?: string);
}
export declare class ContentRetryEvent implements BaseTelemetryEvent {
    'event.name': 'content_retry';
    'event.timestamp': string;
    attempt_number: number;
    error_type: string;
    retry_delay_ms: number;
    model: string;
    constructor(attempt_number: number, error_type: string, retry_delay_ms: number, model: string);
}
export declare class ContentRetryFailureEvent implements BaseTelemetryEvent {
    'event.name': 'content_retry_failure';
    'event.timestamp': string;
    total_attempts: number;
    final_error_type: string;
    total_duration_ms?: number;
    model: string;
    constructor(total_attempts: number, final_error_type: string, model: string, total_duration_ms?: number);
}
export declare class ExtensionInstallEvent implements BaseTelemetryEvent {
    'event.name': 'extension_install';
    'event.timestamp': string;
    extension_name: string;
    extension_version: string;
    extension_source: string;
    status: 'success' | 'error';
    constructor(extension_name: string, extension_version: string, extension_source: string, status: 'success' | 'error');
}
export declare class ToolOutputTruncatedEvent implements BaseTelemetryEvent {
    readonly eventName = "tool_output_truncated";
    readonly 'event.timestamp': string;
    'event.name': string;
    tool_name: string;
    original_content_length: number;
    truncated_content_length: number;
    threshold: number;
    lines: number;
    prompt_id: string;
    constructor(prompt_id: string, details: {
        toolName: string;
        originalContentLength: number;
        truncatedContentLength: number;
        threshold: number;
        lines: number;
    });
}
export declare class ExtensionUninstallEvent implements BaseTelemetryEvent {
    'event.name': 'extension_uninstall';
    'event.timestamp': string;
    extension_name: string;
    status: 'success' | 'error';
    constructor(extension_name: string, status: 'success' | 'error');
}
export declare class ExtensionUpdateEvent implements BaseTelemetryEvent {
    'event.name': 'extension_update';
    'event.timestamp': string;
    extension_name: string;
    extension_id: string;
    extension_previous_version: string;
    extension_version: string;
    extension_source: string;
    status: 'success' | 'error';
    constructor(extension_name: string, extension_id: string, extension_version: string, extension_previous_version: string, extension_source: string, status: 'success' | 'error');
}
export declare class ExtensionEnableEvent implements BaseTelemetryEvent {
    'event.name': 'extension_enable';
    'event.timestamp': string;
    extension_name: string;
    setting_scope: string;
    constructor(extension_name: string, settingScope: string);
}
export declare class ModelSlashCommandEvent implements BaseTelemetryEvent {
    'event.name': 'model_slash_command';
    'event.timestamp': string;
    model_name: string;
    constructor(model_name: string);
}
export declare class SubagentExecutionEvent implements BaseTelemetryEvent {
    'event.name': 'subagent_execution';
    'event.timestamp': string;
    subagent_name: string;
    status: 'started' | 'completed' | 'failed' | 'cancelled';
    terminate_reason?: string;
    result?: string;
    execution_summary?: string;
    constructor(subagent_name: string, status: 'started' | 'completed' | 'failed' | 'cancelled', options?: {
        terminate_reason?: string;
        result?: string;
        execution_summary?: string;
    });
}
export declare class AuthEvent implements BaseTelemetryEvent {
    'event.name': 'auth';
    'event.timestamp': string;
    auth_type: AuthType;
    action_type: 'auto' | 'manual' | 'coding-plan';
    status: 'success' | 'error' | 'cancelled';
    error_message?: string;
    constructor(auth_type: AuthType, action_type: 'auto' | 'manual' | 'coding-plan', status: 'success' | 'error' | 'cancelled', error_message?: string);
}
/**
 * Hook call telemetry event
 */
export declare class HookCallEvent implements BaseTelemetryEvent {
    'event.name': string;
    'event.timestamp': string;
    hook_event_name: string;
    hook_type: 'command';
    hook_name: string;
    hook_input: Record<string, unknown>;
    hook_output?: Record<string, unknown>;
    exit_code?: number;
    stdout?: string;
    stderr?: string;
    duration_ms: number;
    success: boolean;
    error?: string;
    constructor(hookEventName: string, hookType: 'command', hookName: string, hookInput: Record<string, unknown>, durationMs: number, success: boolean, hookOutput?: Record<string, unknown>, exitCode?: number, stdout?: string, stderr?: string, error?: string);
}
export declare class SkillLaunchEvent implements BaseTelemetryEvent {
    'event.name': 'skill_launch';
    'event.timestamp': string;
    skill_name: string;
    success: boolean;
    constructor(skill_name: string, success: boolean);
}
export declare enum UserFeedbackRating {
    BAD = 1,
    FINE = 2,
    GOOD = 3
}
export declare class UserFeedbackEvent implements BaseTelemetryEvent {
    'event.name': 'user_feedback';
    'event.timestamp': string;
    session_id: string;
    rating: UserFeedbackRating;
    model: string;
    approval_mode: string;
    prompt_id?: string;
    constructor(session_id: string, rating: UserFeedbackRating, model: string, approval_mode: string, prompt_id?: string);
}
export type TelemetryEvent = StartSessionEvent | EndSessionEvent | UserPromptEvent | ToolCallEvent | ApiRequestEvent | ApiErrorEvent | ApiCancelEvent | ApiResponseEvent | FlashFallbackEvent | LoopDetectedEvent | LoopDetectionDisabledEvent | NextSpeakerCheckEvent | KittySequenceOverflowEvent | MalformedJsonResponseEvent | IdeConnectionEvent | ConversationFinishedEvent | SlashCommandEvent | FileOperationEvent | InvalidChunkEvent | ContentRetryEvent | ContentRetryFailureEvent | SubagentExecutionEvent | ExtensionEnableEvent | ExtensionInstallEvent | ExtensionUninstallEvent | ToolOutputTruncatedEvent | ModelSlashCommandEvent | AuthEvent | HookCallEvent | SkillLaunchEvent | UserFeedbackEvent | ArenaSessionStartedEvent | ArenaAgentCompletedEvent | ArenaSessionEndedEvent;
export interface ArenaSessionStartedEvent extends BaseTelemetryEvent {
    'event.name': 'arena_session_started';
    arena_session_id: string;
    model_ids: string[];
    task_length: number;
}
export declare function makeArenaSessionStartedEvent({ arena_session_id, model_ids, task_length }: Omit<ArenaSessionStartedEvent, CommonFields>): ArenaSessionStartedEvent;
export type ArenaAgentCompletedStatus = 'completed' | 'failed' | 'cancelled';
export interface ArenaAgentCompletedEvent extends BaseTelemetryEvent {
    'event.name': 'arena_agent_completed';
    arena_session_id: string;
    agent_session_id: string;
    agent_model_id: string;
    status: ArenaAgentCompletedStatus;
    duration_ms: number;
    rounds: number;
    total_tokens: number;
    input_tokens: number;
    output_tokens: number;
    tool_calls: number;
    successful_tool_calls: number;
    failed_tool_calls: number;
}
export declare function makeArenaAgentCompletedEvent({ arena_session_id, agent_session_id, agent_model_id, status, duration_ms, rounds, total_tokens, input_tokens, output_tokens, tool_calls, successful_tool_calls, failed_tool_calls }: Omit<ArenaAgentCompletedEvent, CommonFields>): ArenaAgentCompletedEvent;
export type ArenaSessionEndedStatus = 'selected' | 'discarded' | 'failed' | 'cancelled';
export interface ArenaSessionEndedEvent extends BaseTelemetryEvent {
    'event.name': 'arena_session_ended';
    arena_session_id: string;
    status: ArenaSessionEndedStatus;
    duration_ms: number;
    display_backend?: string;
    agent_count: number;
    completed_agents: number;
    failed_agents: number;
    cancelled_agents: number;
    winner_model_id?: string;
}
export declare function makeArenaSessionEndedEvent({ arena_session_id, status, duration_ms, display_backend, agent_count, completed_agents, failed_agents, cancelled_agents, winner_model_id }: Omit<ArenaSessionEndedEvent, CommonFields>): ArenaSessionEndedEvent;
export declare class ExtensionDisableEvent implements BaseTelemetryEvent {
    'event.name': 'extension_disable';
    'event.timestamp': string;
    extension_name: string;
    setting_scope: string;
    constructor(extension_name: string, settingScope: string);
}
export declare class PromptSuggestionEvent implements BaseTelemetryEvent {
    'event.name': 'aether-cli.prompt_suggestion';
    'event.timestamp': string;
    outcome: 'accepted' | 'ignored' | 'suppressed';
    prompt_id?: string;
    accept_method?: 'tab' | 'enter' | 'right';
    time_to_accept_ms?: number;
    time_to_ignore_ms?: number;
    time_to_first_keystroke_ms?: number;
    suggestion_length?: number;
    similarity?: number;
    was_focused_when_shown?: boolean;
    reason?: string;
    constructor(params: {
        outcome: 'accepted' | 'ignored' | 'suppressed';
        prompt_id?: string;
        accept_method?: 'tab' | 'enter' | 'right';
        time_to_accept_ms?: number;
        time_to_ignore_ms?: number;
        time_to_first_keystroke_ms?: number;
        suggestion_length?: number;
        similarity?: number;
        was_focused_when_shown?: boolean;
        reason?: string;
    });
}
export declare class SpeculationEvent implements BaseTelemetryEvent {
    'event.name': 'aether-cli.speculation';
    'event.timestamp': string;
    outcome: 'accepted' | 'aborted' | 'failed';
    turns_used: number;
    files_written: number;
    tool_use_count: number;
    duration_ms: number;
    boundary_type?: string;
    had_pipelined_suggestion: boolean;
    constructor(params: {
        outcome: 'accepted' | 'aborted' | 'failed';
        turns_used: number;
        files_written: number;
        tool_use_count: number;
        duration_ms: number;
        boundary_type?: string;
        had_pipelined_suggestion: boolean;
    });
}
