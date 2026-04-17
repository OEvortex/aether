/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { DiscoveredMCPTool } from '../tools/mcp-tool.js';
import { getDecisionFromOutcome, ToolCallDecision } from './tool-call-decision.js';
export { ToolCallDecision };
import { ToolNames } from '../tools/tool-names.js';
export class StartSessionEvent {
    'event.name';
    'event.timestamp';
    session_id;
    model;
    sandbox_enabled;
    core_tools_enabled;
    approval_mode;
    debug_enabled;
    truncate_tool_output_threshold;
    truncate_tool_output_lines;
    mcp_servers;
    telemetry_enabled;
    file_filtering_respect_git_ignore;
    mcp_servers_count;
    mcp_tools_count;
    mcp_tools;
    output_format;
    hooks;
    ide_enabled;
    interactive_shell_enabled;
    skills;
    subagents;
    constructor(config) {
        const mcpServers = config.getMcpServers();
        const toolRegistry = config.getToolRegistry();
        this['event.name'] = 'cli_config';
        this.session_id = config.getSessionId();
        this.model = config.getModel();
        this.sandbox_enabled =
            typeof config.getSandbox() === 'string' || !!config.getSandbox();
        this.core_tools_enabled = (config.getPermissionManager?.()?.getAllowRawStrings() ??
            config.getCoreTools() ??
            []).join(',');
        this.approval_mode = config.getApprovalMode();
        this.debug_enabled = config.getDebugMode();
        this.truncate_tool_output_threshold =
            config.getTruncateToolOutputThreshold();
        this.truncate_tool_output_lines = config.getTruncateToolOutputLines();
        this.mcp_servers = mcpServers ? Object.keys(mcpServers).join(',') : '';
        this.telemetry_enabled = config.getTelemetryEnabled();
        this.file_filtering_respect_git_ignore =
            config.getFileFilteringRespectGitIgnore();
        this.mcp_servers_count = mcpServers
            ? Object.keys(mcpServers).length
            : 0;
        this.output_format = config.getOutputFormat();
        this.ide_enabled = config.getIdeMode();
        this.interactive_shell_enabled = config.getShouldUseNodePtyShell();
        const hookSystem = config.getHookSystem();
        if (hookSystem) {
            const allHooks = hookSystem.getAllHooks();
            const uniqueEventNames = [
                ...new Set(allHooks.map((h) => h.eventName))
            ];
            if (uniqueEventNames.length > 0) {
                this.hooks = uniqueEventNames.join(',');
            }
        }
        if (toolRegistry) {
            const mcpTools = toolRegistry
                .getAllTools()
                .filter((tool) => tool instanceof DiscoveredMCPTool);
            this.mcp_tools_count = mcpTools.length;
            this.mcp_tools = mcpTools
                .map((tool) => tool.name)
                .join(',');
            const skillTool = toolRegistry.getTool(ToolNames.SKILL);
            const skillNames = skillTool?.getAvailableSkillNames?.();
            if (skillNames && skillNames.length > 0) {
                this.skills = skillNames.join(',');
            }
            const agentTool = toolRegistry.getTool(ToolNames.AGENT);
            const subagentNames = agentTool?.getAvailableSubagentNames?.();
            if (subagentNames && subagentNames.length > 0) {
                this.subagents = subagentNames.join(',');
            }
        }
    }
}
export class EndSessionEvent {
    'event.name';
    'event.timestamp';
    session_id;
    constructor(config) {
        this['event.name'] = 'end_session';
        this['event.timestamp'] = new Date().toISOString();
        this.session_id = config?.getSessionId();
    }
}
export class UserPromptEvent {
    'event.name';
    'event.timestamp';
    prompt_length;
    prompt_id;
    auth_type;
    prompt;
    constructor(prompt_length, prompt_Id, auth_type, prompt) {
        this['event.name'] = 'user_prompt';
        this['event.timestamp'] = new Date().toISOString();
        this.prompt_length = prompt_length;
        this.prompt_id = prompt_Id;
        this.auth_type = auth_type;
        this.prompt = prompt;
    }
}
export class UserRetryEvent {
    'event.name';
    'event.timestamp';
    prompt_id;
    constructor(prompt_id) {
        this['event.name'] = 'user_retry';
        this['event.timestamp'] = new Date().toISOString();
        this.prompt_id = prompt_id;
    }
}
export class ToolCallEvent {
    'event.name';
    'event.timestamp';
    function_name;
    function_args;
    duration_ms;
    status;
    success; // Keep for backward compatibility
    decision;
    error;
    error_type;
    prompt_id;
    response_id;
    tool_type;
    content_length;
    mcp_server_name;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata;
    constructor(call) {
        this['event.name'] = 'tool_call';
        this['event.timestamp'] = new Date().toISOString();
        this.function_name = call.request.name;
        this.function_args = call.request.args;
        this.duration_ms = call.durationMs ?? 0;
        this.status = call.status;
        this.success = call.status === 'success'; // Keep for backward compatibility
        this.decision = call.outcome
            ? getDecisionFromOutcome(call.outcome)
            : undefined;
        this.error = call.response.error?.message;
        this.error_type = call.response.errorType;
        this.prompt_id = call.request.prompt_id;
        this.content_length = call.response.contentLength;
        if (typeof call.tool !== 'undefined' &&
            call.tool instanceof DiscoveredMCPTool) {
            this.tool_type = 'mcp';
            this.mcp_server_name = call.tool.serverName;
        }
        else {
            this.tool_type = 'native';
        }
        this.response_id = call.request.response_id;
        if (call.status === 'success' &&
            typeof call.response.resultDisplay === 'object' &&
            call.response.resultDisplay !== null &&
            'diffStat' in call.response.resultDisplay) {
            const diffStat = call.response.resultDisplay.diffStat;
            if (diffStat) {
                this.metadata = {
                    model_added_lines: diffStat.model_added_lines,
                    model_removed_lines: diffStat.model_removed_lines,
                    model_added_chars: diffStat.model_added_chars,
                    model_removed_chars: diffStat.model_removed_chars,
                    user_added_lines: diffStat.user_added_lines,
                    user_removed_lines: diffStat.user_removed_lines,
                    user_added_chars: diffStat.user_added_chars,
                    user_removed_chars: diffStat.user_removed_chars
                };
            }
        }
    }
}
export class ApiRequestEvent {
    'event.name';
    'event.timestamp';
    model;
    prompt_id;
    request_text;
    constructor(model, prompt_id, request_text) {
        this['event.name'] = 'api_request';
        this['event.timestamp'] = new Date().toISOString();
        this.model = model;
        this.prompt_id = prompt_id;
        this.request_text = request_text;
    }
}
export class ApiErrorEvent {
    'event.name';
    'event.timestamp'; // ISO 8601
    response_id;
    model;
    duration_ms;
    prompt_id;
    auth_type;
    // Human-readable error message (e.g. "Request failed with status 429")
    error_message;
    // Error class or category (e.g. "RateLimitError", "invalid_request_error")
    error_type;
    // HTTP status code from the API response (e.g. 429, 500)
    status_code;
    constructor(opts) {
        this['event.name'] = 'api_error';
        this['event.timestamp'] = new Date().toISOString();
        this.response_id = opts.responseId;
        this.model = opts.model;
        this.duration_ms = opts.durationMs;
        this.prompt_id = opts.promptId;
        this.auth_type = opts.authType;
        this.error_message = opts.errorMessage;
        this.error_type = opts.errorType;
        this.status_code = opts.statusCode;
    }
}
export class ApiCancelEvent {
    'event.name';
    'event.timestamp';
    model;
    prompt_id;
    auth_type;
    constructor(model, prompt_id, auth_type) {
        this['event.name'] = 'api_cancel';
        this['event.timestamp'] = new Date().toISOString();
        this.model = model;
        this.prompt_id = prompt_id;
        this.auth_type = auth_type;
    }
}
export class ApiResponseEvent {
    'event.name';
    'event.timestamp'; // ISO 8601
    response_id;
    model;
    status_code;
    duration_ms;
    input_token_count;
    output_token_count;
    cached_content_token_count;
    thoughts_token_count;
    tool_token_count;
    total_token_count;
    response_text;
    prompt_id;
    auth_type;
    constructor(response_id, model, duration_ms, prompt_id, auth_type, usage_data, response_text) {
        this['event.name'] = 'api_response';
        this['event.timestamp'] = new Date().toISOString();
        this.response_id = response_id;
        this.model = model;
        this.duration_ms = duration_ms;
        this.status_code = 200;
        this.input_token_count = usage_data?.promptTokenCount ?? 0;
        this.output_token_count = usage_data?.candidatesTokenCount ?? 0;
        this.cached_content_token_count =
            usage_data?.cachedContentTokenCount ?? 0;
        this.thoughts_token_count = usage_data?.thoughtsTokenCount ?? 0;
        this.tool_token_count = usage_data?.toolUsePromptTokenCount ?? 0;
        this.total_token_count = usage_data?.totalTokenCount ?? 0;
        this.response_text = response_text;
        this.prompt_id = prompt_id;
        this.auth_type = auth_type;
    }
}
export class FlashFallbackEvent {
    'event.name';
    'event.timestamp';
    auth_type;
    constructor(auth_type) {
        this['event.name'] = 'flash_fallback';
        this['event.timestamp'] = new Date().toISOString();
        this.auth_type = auth_type;
    }
}
export class RipgrepFallbackEvent {
    'event.name';
    'event.timestamp';
    use_ripgrep;
    use_builtin_ripgrep;
    error;
    constructor(use_ripgrep, use_builtin_ripgrep, error) {
        this['event.name'] = 'ripgrep_fallback';
        this['event.timestamp'] = new Date().toISOString();
        this.use_ripgrep = use_ripgrep;
        this.use_builtin_ripgrep = use_builtin_ripgrep;
        this.error = error;
    }
}
export var LoopType;
(function (LoopType) {
    LoopType["CONSECUTIVE_IDENTICAL_TOOL_CALLS"] = "consecutive_identical_tool_calls";
    LoopType["CHANTING_IDENTICAL_SENTENCES"] = "chanting_identical_sentences";
})(LoopType || (LoopType = {}));
export class LoopDetectedEvent {
    'event.name';
    'event.timestamp';
    loop_type;
    prompt_id;
    constructor(loop_type, prompt_id) {
        this['event.name'] = 'loop_detected';
        this['event.timestamp'] = new Date().toISOString();
        this.loop_type = loop_type;
        this.prompt_id = prompt_id;
    }
}
export class LoopDetectionDisabledEvent {
    'event.name';
    'event.timestamp';
    prompt_id;
    constructor(prompt_id) {
        this['event.name'] = 'loop_detection_disabled';
        this['event.timestamp'] = new Date().toISOString();
        this.prompt_id = prompt_id;
    }
}
export class NextSpeakerCheckEvent {
    'event.name';
    'event.timestamp';
    prompt_id;
    finish_reason;
    result;
    constructor(prompt_id, finish_reason, result) {
        this['event.name'] = 'next_speaker_check';
        this['event.timestamp'] = new Date().toISOString();
        this.prompt_id = prompt_id;
        this.finish_reason = finish_reason;
        this.result = result;
    }
}
export function makeSlashCommandEvent({ command, subcommand, status }) {
    return {
        'event.name': 'slash_command',
        'event.timestamp': new Date().toISOString(),
        command,
        subcommand,
        status
    };
}
export var SlashCommandStatus;
(function (SlashCommandStatus) {
    SlashCommandStatus["SUCCESS"] = "success";
    SlashCommandStatus["ERROR"] = "error";
})(SlashCommandStatus || (SlashCommandStatus = {}));
export function makeChatCompressionEvent({ tokens_before, tokens_after, compression_input_token_count, compression_output_token_count }) {
    return {
        'event.name': 'chat_compression',
        'event.timestamp': new Date().toISOString(),
        tokens_before,
        tokens_after,
        ...(compression_input_token_count !== undefined
            ? { compression_input_token_count }
            : {}),
        ...(compression_output_token_count !== undefined
            ? { compression_output_token_count }
            : {})
    };
}
export class MalformedJsonResponseEvent {
    'event.name';
    'event.timestamp';
    model;
    constructor(model) {
        this['event.name'] = 'malformed_json_response';
        this['event.timestamp'] = new Date().toISOString();
        this.model = model;
    }
}
export var IdeConnectionType;
(function (IdeConnectionType) {
    IdeConnectionType["START"] = "start";
    IdeConnectionType["SESSION"] = "session";
})(IdeConnectionType || (IdeConnectionType = {}));
export class IdeConnectionEvent {
    'event.name';
    'event.timestamp';
    connection_type;
    constructor(connection_type) {
        this['event.name'] = 'ide_connection';
        this['event.timestamp'] = new Date().toISOString();
        this.connection_type = connection_type;
    }
}
export class ConversationFinishedEvent {
    event_name;
    'event.timestamp'; // ISO 8601;
    approvalMode;
    turnCount;
    constructor(approvalMode, turnCount) {
        this.event_name = 'conversation_finished';
        this['event.timestamp'] = new Date().toISOString();
        this.approvalMode = approvalMode;
        this.turnCount = turnCount;
    }
}
export class KittySequenceOverflowEvent {
    'event.name';
    'event.timestamp'; // ISO 8601
    sequence_length;
    truncated_sequence;
    constructor(sequence_length, truncated_sequence) {
        this['event.name'] = 'kitty_sequence_overflow';
        this['event.timestamp'] = new Date().toISOString();
        this.sequence_length = sequence_length;
        // Truncate to first 20 chars for logging (avoid logging sensitive data)
        this.truncated_sequence = truncated_sequence.substring(0, 20);
    }
}
export class FileOperationEvent {
    'event.name';
    'event.timestamp';
    tool_name;
    operation;
    lines;
    mimetype;
    extension;
    programming_language;
    constructor(tool_name, operation, lines, mimetype, extension, programming_language) {
        this['event.name'] = 'file_operation';
        this['event.timestamp'] = new Date().toISOString();
        this.tool_name = tool_name;
        this.operation = operation;
        this.lines = lines;
        this.mimetype = mimetype;
        this.extension = extension;
        this.programming_language = programming_language;
    }
}
// Add these new event interfaces
export class InvalidChunkEvent {
    'event.name';
    'event.timestamp';
    error_message; // Optional: validation error details
    constructor(error_message) {
        this['event.name'] = 'invalid_chunk';
        this['event.timestamp'] = new Date().toISOString();
        this.error_message = error_message;
    }
}
export class ContentRetryEvent {
    'event.name';
    'event.timestamp';
    attempt_number;
    error_type; // e.g., 'EmptyStreamError'
    retry_delay_ms;
    model;
    constructor(attempt_number, error_type, retry_delay_ms, model) {
        this['event.name'] = 'content_retry';
        this['event.timestamp'] = new Date().toISOString();
        this.attempt_number = attempt_number;
        this.error_type = error_type;
        this.retry_delay_ms = retry_delay_ms;
        this.model = model;
    }
}
export class ContentRetryFailureEvent {
    'event.name';
    'event.timestamp';
    total_attempts;
    final_error_type;
    total_duration_ms; // Optional: total time spent retrying
    model;
    constructor(total_attempts, final_error_type, model, total_duration_ms) {
        this['event.name'] = 'content_retry_failure';
        this['event.timestamp'] = new Date().toISOString();
        this.total_attempts = total_attempts;
        this.final_error_type = final_error_type;
        this.total_duration_ms = total_duration_ms;
        this.model = model;
    }
}
export class ExtensionInstallEvent {
    'event.name';
    'event.timestamp';
    extension_name;
    extension_version;
    extension_source;
    status;
    constructor(extension_name, extension_version, extension_source, status) {
        this['event.name'] = 'extension_install';
        this['event.timestamp'] = new Date().toISOString();
        this.extension_name = extension_name;
        this.extension_version = extension_version;
        this.extension_source = extension_source;
        this.status = status;
    }
}
export class ToolOutputTruncatedEvent {
    eventName = 'tool_output_truncated';
    'event.timestamp' = new Date().toISOString();
    'event.name';
    tool_name;
    original_content_length;
    truncated_content_length;
    threshold;
    lines;
    prompt_id;
    constructor(prompt_id, details) {
        this['event.name'] = this.eventName;
        this.prompt_id = prompt_id;
        this.tool_name = details.toolName;
        this.original_content_length = details.originalContentLength;
        this.truncated_content_length = details.truncatedContentLength;
        this.threshold = details.threshold;
        this.lines = details.lines;
    }
}
export class ExtensionUninstallEvent {
    'event.name';
    'event.timestamp';
    extension_name;
    status;
    constructor(extension_name, status) {
        this['event.name'] = 'extension_uninstall';
        this['event.timestamp'] = new Date().toISOString();
        this.extension_name = extension_name;
        this.status = status;
    }
}
export class ExtensionUpdateEvent {
    'event.name';
    'event.timestamp';
    extension_name;
    extension_id;
    extension_previous_version;
    extension_version;
    extension_source;
    status;
    constructor(extension_name, extension_id, extension_version, extension_previous_version, extension_source, status) {
        this['event.name'] = 'extension_update';
        this['event.timestamp'] = new Date().toISOString();
        this.extension_name = extension_name;
        this.extension_id = extension_id;
        this.extension_version = extension_version;
        this.extension_previous_version = extension_previous_version;
        this.extension_source = extension_source;
        this.status = status;
    }
}
export class ExtensionEnableEvent {
    'event.name';
    'event.timestamp';
    extension_name;
    setting_scope;
    constructor(extension_name, settingScope) {
        this['event.name'] = 'extension_enable';
        this['event.timestamp'] = new Date().toISOString();
        this.extension_name = extension_name;
        this.setting_scope = settingScope;
    }
}
export class ModelSlashCommandEvent {
    'event.name';
    'event.timestamp';
    model_name;
    constructor(model_name) {
        this['event.name'] = 'model_slash_command';
        this['event.timestamp'] = new Date().toISOString();
        this.model_name = model_name;
    }
}
export class SubagentExecutionEvent {
    'event.name';
    'event.timestamp';
    subagent_name;
    status;
    terminate_reason;
    result;
    execution_summary;
    constructor(subagent_name, status, options) {
        this['event.name'] = 'subagent_execution';
        this['event.timestamp'] = new Date().toISOString();
        this.subagent_name = subagent_name;
        this.status = status;
        this.terminate_reason = options?.terminate_reason;
        this.result = options?.result;
        this.execution_summary = options?.execution_summary;
    }
}
export class AuthEvent {
    'event.name';
    'event.timestamp';
    auth_type;
    action_type;
    status;
    error_message;
    constructor(auth_type, action_type, status, error_message) {
        this['event.name'] = 'auth';
        this['event.timestamp'] = new Date().toISOString();
        this.auth_type = auth_type;
        this.action_type = action_type;
        this.status = status;
        this.error_message = error_message;
    }
}
/**
 * Hook call telemetry event
 */
export class HookCallEvent {
    'event.name';
    'event.timestamp';
    hook_event_name;
    hook_type;
    hook_name;
    hook_input;
    hook_output;
    exit_code;
    stdout;
    stderr;
    duration_ms;
    success;
    error;
    constructor(hookEventName, hookType, hookName, hookInput, durationMs, success, hookOutput, exitCode, stdout, stderr, error) {
        this['event.name'] = 'hook_call';
        this['event.timestamp'] = new Date().toISOString();
        this.hook_event_name = hookEventName;
        this.hook_type = hookType;
        this.hook_name = hookName;
        this.hook_input = hookInput;
        this.hook_output = hookOutput;
        this.exit_code = exitCode;
        this.stdout = stdout;
        this.stderr = stderr;
        this.duration_ms = durationMs;
        this.success = success;
        this.error = error;
    }
}
export class SkillLaunchEvent {
    'event.name';
    'event.timestamp';
    skill_name;
    success;
    constructor(skill_name, success) {
        this['event.name'] = 'skill_launch';
        this['event.timestamp'] = new Date().toISOString();
        this.skill_name = skill_name;
        this.success = success;
    }
}
export var UserFeedbackRating;
(function (UserFeedbackRating) {
    UserFeedbackRating[UserFeedbackRating["BAD"] = 1] = "BAD";
    UserFeedbackRating[UserFeedbackRating["FINE"] = 2] = "FINE";
    UserFeedbackRating[UserFeedbackRating["GOOD"] = 3] = "GOOD";
})(UserFeedbackRating || (UserFeedbackRating = {}));
export class UserFeedbackEvent {
    'event.name';
    'event.timestamp';
    session_id;
    rating;
    model;
    approval_mode;
    prompt_id;
    constructor(session_id, rating, model, approval_mode, prompt_id) {
        this['event.name'] = 'user_feedback';
        this['event.timestamp'] = new Date().toISOString();
        this.session_id = session_id;
        this.rating = rating;
        this.model = model;
        this.approval_mode = approval_mode;
        this.prompt_id = prompt_id;
    }
}
export function makeArenaSessionStartedEvent({ arena_session_id, model_ids, task_length }) {
    return {
        'event.name': 'arena_session_started',
        'event.timestamp': new Date().toISOString(),
        arena_session_id,
        model_ids,
        task_length
    };
}
export function makeArenaAgentCompletedEvent({ arena_session_id, agent_session_id, agent_model_id, status, duration_ms, rounds, total_tokens, input_tokens, output_tokens, tool_calls, successful_tool_calls, failed_tool_calls }) {
    return {
        'event.name': 'arena_agent_completed',
        'event.timestamp': new Date().toISOString(),
        arena_session_id,
        agent_session_id,
        agent_model_id,
        status,
        duration_ms,
        rounds,
        total_tokens,
        input_tokens,
        output_tokens,
        tool_calls,
        successful_tool_calls,
        failed_tool_calls
    };
}
export function makeArenaSessionEndedEvent({ arena_session_id, status, duration_ms, display_backend, agent_count, completed_agents, failed_agents, cancelled_agents, winner_model_id }) {
    return {
        'event.name': 'arena_session_ended',
        'event.timestamp': new Date().toISOString(),
        arena_session_id,
        status,
        duration_ms,
        display_backend,
        agent_count,
        completed_agents,
        failed_agents,
        cancelled_agents,
        winner_model_id
    };
}
export class ExtensionDisableEvent {
    'event.name';
    'event.timestamp';
    extension_name;
    setting_scope;
    constructor(extension_name, settingScope) {
        this['event.name'] = 'extension_disable';
        this['event.timestamp'] = new Date().toISOString();
        this.extension_name = extension_name;
        this.setting_scope = settingScope;
    }
}
export class PromptSuggestionEvent {
    'event.name';
    'event.timestamp';
    outcome;
    prompt_id;
    accept_method;
    time_to_accept_ms;
    time_to_ignore_ms;
    time_to_first_keystroke_ms;
    suggestion_length;
    similarity;
    was_focused_when_shown;
    reason;
    constructor(params) {
        this['event.name'] = 'aether-cli.prompt_suggestion';
        this['event.timestamp'] = new Date().toISOString();
        this.outcome = params.outcome;
        this.prompt_id = params.prompt_id ?? 'user_intent';
        this.accept_method = params.accept_method;
        this.time_to_accept_ms = params.time_to_accept_ms;
        this.time_to_ignore_ms = params.time_to_ignore_ms;
        this.time_to_first_keystroke_ms = params.time_to_first_keystroke_ms;
        this.suggestion_length = params.suggestion_length;
        this.similarity = params.similarity;
        this.was_focused_when_shown = params.was_focused_when_shown;
        this.reason = params.reason;
    }
}
export class SpeculationEvent {
    'event.name';
    'event.timestamp';
    outcome;
    turns_used;
    files_written;
    tool_use_count;
    duration_ms;
    boundary_type;
    had_pipelined_suggestion;
    constructor(params) {
        this['event.name'] = 'aether-cli.speculation';
        this['event.timestamp'] = new Date().toISOString();
        this.outcome = params.outcome;
        this.turns_used = params.turns_used;
        this.files_written = params.files_written;
        this.tool_use_count = params.tool_use_count;
        this.duration_ms = params.duration_ms;
        this.boundary_type = params.boundary_type;
        this.had_pipelined_suggestion = params.had_pipelined_suggestion;
    }
}
//# sourceMappingURL=types.js.map