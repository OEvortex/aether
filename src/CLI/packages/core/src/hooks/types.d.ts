export declare enum HooksConfigSource {
    Project = "project",
    User = "user",
    System = "system",
    Extensions = "extensions"
}
/**
 * Event names for the hook system
 */
export declare enum HookEventName {
    PreToolUse = "PreToolUse",
    PostToolUse = "PostToolUse",
    PostToolUseFailure = "PostToolUseFailure",
    Notification = "Notification",
    UserPromptSubmit = "UserPromptSubmit",
    SessionStart = "SessionStart",
    Stop = "Stop",
    SubagentStart = "SubagentStart",
    SubagentStop = "SubagentStop",
    PreCompact = "PreCompact",
    SessionEnd = "SessionEnd",
    PermissionRequest = "PermissionRequest"
}
/**
 * Fields in the hooks configuration that are not hook event names
 */
export declare const HOOKS_CONFIG_FIELDS: string[];
/**
 * Hook configuration entry
 */
export interface CommandHookConfig {
    type: HookType.Command;
    command: string;
    name?: string;
    description?: string;
    timeout?: number;
    source?: HooksConfigSource;
    env?: Record<string, string>;
}
export type HookConfig = CommandHookConfig;
/**
 * Hook definition with matcher
 */
export interface HookDefinition {
    matcher?: string;
    sequential?: boolean;
    hooks: HookConfig[];
}
/**
 * Hook implementation types
 */
export declare enum HookType {
    Command = "command"
}
/**
 * Generate a unique key for a hook configuration
 */
export declare function getHookKey(hook: HookConfig): string;
/**
 * Decision types for hook outputs
 */
export type HookDecision = 'ask' | 'block' | 'deny' | 'approve' | 'allow';
/**
 * Base hook input - common fields for all events
 */
export interface HookInput {
    session_id: string;
    transcript_path: string;
    cwd: string;
    hook_event_name: string;
    timestamp: string;
}
/**
 * Base hook output - common fields for all events
 */
export interface HookOutput {
    continue?: boolean;
    stopReason?: string;
    suppressOutput?: boolean;
    systemMessage?: string;
    decision?: HookDecision;
    reason?: string;
    hookSpecificOutput?: Record<string, unknown>;
}
/**
 * Factory function to create the appropriate hook output class based on event name
 * Returns specialized HookOutput subclasses for events with specific methods
 */
export declare function createHookOutput(eventName: string, data: Partial<HookOutput>): DefaultHookOutput;
/**
 * Default implementation of HookOutput with utility methods
 */
export declare class DefaultHookOutput implements HookOutput {
    continue?: boolean;
    stopReason?: string;
    suppressOutput?: boolean;
    systemMessage?: string;
    decision?: HookDecision;
    reason?: string;
    hookSpecificOutput?: Record<string, unknown>;
    constructor(data?: Partial<HookOutput>);
    /**
     * Check if this output represents a blocking decision
     */
    isBlockingDecision(): boolean;
    /**
     * Check if this output requests to stop execution
     */
    shouldStopExecution(): boolean;
    /**
     * Get the effective reason for blocking or stopping
     */
    getEffectiveReason(): string;
    /**
     * Get sanitized additional context for adding to responses.
     */
    getAdditionalContext(): string | undefined;
    /**
     * Check if execution should be blocked and return error info
     */
    getBlockingError(): {
        blocked: boolean;
        reason: string;
    };
    /**
     * Check if context clearing was requested by hook.
     */
    shouldClearContext(): boolean;
}
/**
 * Specific hook output class for PreToolUse events.
 */
export declare class PreToolUseHookOutput extends DefaultHookOutput {
    /**
     * Get permission decision from hook output
     * @returns 'allow' | 'deny' | 'ask' | undefined
     */
    getPermissionDecision(): 'allow' | 'deny' | 'ask' | undefined;
    /**
     * Get permission decision reason
     */
    getPermissionDecisionReason(): string | undefined;
    /**
     * Check if permission was denied
     */
    isDenied(): boolean;
    /**
     * Check if user confirmation is required
     */
    isAsk(): boolean;
    /**
     * Check if permission was allowed
     */
    isAllowed(): boolean;
}
/**
 * Specific hook output class for PostToolUse events.
 * Default behavior is to allow tool usage if the hook does not explicitly set a decision.
 * This follows the security model of allowing by default unless explicitly blocked.
 */
export declare class PostToolUseHookOutput extends DefaultHookOutput {
    decision: HookDecision;
    reason: string;
    constructor(data?: Partial<HookOutput>);
}
/**
 * Specific hook output class for PostToolUseFailure events.
 */
export declare class PostToolUseFailureHookOutput extends DefaultHookOutput {
    /**
     * Get additional context to provide error handling information
     */
    getAdditionalContext(): string | undefined;
}
/**
 * Specific hook output class for Stop events.
 */
export declare class StopHookOutput extends DefaultHookOutput {
    stopReason?: string;
    constructor(data?: Partial<HookOutput>);
    /**
     * Get the stop reason if provided
     */
    getStopReason(): string | undefined;
}
/**
 * Permission suggestion type
 */
export interface PermissionSuggestion {
    type: string;
    tool?: string;
}
/**
 * Input for PermissionRequest hook events
 */
export interface PermissionRequestInput extends HookInput {
    permission_mode: PermissionMode;
    tool_name: string;
    tool_input: Record<string, unknown>;
    permission_suggestions?: PermissionSuggestion[];
}
/**
 * Decision object for PermissionRequest hooks
 */
export interface PermissionRequestDecision {
    behavior: 'allow' | 'deny';
    updatedInput?: Record<string, unknown>;
    updatedPermissions?: PermissionSuggestion[];
    message?: string;
    interrupt?: boolean;
}
/**
 * Specific hook output class for PermissionRequest events.
 */
export declare class PermissionRequestHookOutput extends DefaultHookOutput {
    /**
     * Get the permission decision if provided by hook
     */
    getPermissionDecision(): PermissionRequestDecision | undefined;
    /**
     * Check if the permission was denied
     */
    isPermissionDenied(): boolean;
    /**
     * Get the deny message if permission was denied
     */
    getDenyMessage(): string | undefined;
    /**
     * Check if execution should be interrupted after denial
     */
    shouldInterrupt(): boolean;
    /**
     * Get updated tool input if permission was allowed with modifications
     */
    getUpdatedToolInput(): Record<string, unknown> | undefined;
    /**
     * Get updated permissions if permission was allowed with permission updates
     */
    getUpdatedPermissions(): PermissionSuggestion[] | undefined;
}
/**
 * PreToolUse hook input
 */
export interface PreToolUseInput extends HookInput {
    permission_mode: PermissionMode;
    tool_name: string;
    tool_input: Record<string, unknown>;
    tool_use_id: string;
}
/**
 * PreToolUse hook output
 */
export interface PreToolUseOutput extends HookOutput {
    hookSpecificOutput: {
        hookEventName: 'PreToolUse';
        permissionDecision: 'allow' | 'deny' | 'ask';
        permissionDecisionReason: string;
    };
}
/**
 * PostToolUse hook input
 */
export interface PostToolUseInput extends HookInput {
    permission_mode: PermissionMode;
    tool_name: string;
    tool_input: Record<string, unknown>;
    tool_response: Record<string, unknown>;
    tool_use_id: string;
}
/**
 * PostToolUse hook output
 */
export interface PostToolUseOutput extends HookOutput {
    decision: HookDecision;
    reason: string;
    hookSpecificOutput?: {
        hookEventName: 'PostToolUse';
        additionalContext?: string;
    };
    updatedMCPToolOutput?: Record<string, unknown>;
}
/**
 * PostToolUseFailure hook input
 * Fired when a tool execution fails
 */
export interface PostToolUseFailureInput extends HookInput {
    permission_mode: PermissionMode;
    tool_use_id: string;
    tool_name: string;
    tool_input: Record<string, unknown>;
    error: string;
    is_interrupt?: boolean;
}
/**
 * PostToolUseFailure hook output
 * Supports all three hook types: command, prompt, and agent
 */
export interface PostToolUseFailureOutput extends HookOutput {
    hookSpecificOutput?: {
        hookEventName: 'PostToolUseFailure';
        additionalContext?: string;
    };
}
/**
 * UserPromptSubmit hook input
 */
export interface UserPromptSubmitInput extends HookInput {
    prompt: string;
}
/**
 * UserPromptSubmit hook output
 */
export interface UserPromptSubmitOutput extends HookOutput {
    hookSpecificOutput?: {
        hookEventName: 'UserPromptSubmit';
        additionalContext?: string;
    };
}
/**
 * Notification types
 */
export declare enum NotificationType {
    PermissionPrompt = "permission_prompt",
    IdlePrompt = "idle_prompt",
    AuthSuccess = "auth_success",
    ElicitationDialog = "elicitation_dialog"
}
/**
 * Notification hook input
 */
export interface NotificationInput extends HookInput {
    message: string;
    title?: string;
    notification_type: NotificationType;
}
/**
 * Notification hook output
 */
export interface NotificationOutput extends HookOutput {
    hookSpecificOutput?: {
        hookEventName: 'Notification';
        additionalContext?: string;
    };
}
/**
 * Stop hook input
 */
export interface StopInput extends HookInput {
    stop_hook_active: boolean;
    last_assistant_message: string;
}
/**
 * Stop hook output
 */
export interface StopOutput extends HookOutput {
    hookSpecificOutput?: {
        hookEventName: 'Stop';
        additionalContext?: string;
    };
}
/**
 * SessionStart source types
 */
export declare enum SessionStartSource {
    Startup = "startup",
    Resume = "resume",
    Clear = "clear",
    Compact = "compact"
}
export declare enum PermissionMode {
    Default = "default",
    Plan = "plan",
    AutoEdit = "auto_edit",
    Yolo = "yolo"
}
/**
 * SessionStart hook input
 */
export interface SessionStartInput extends HookInput {
    permission_mode: PermissionMode;
    source: SessionStartSource;
    model: string;
    agent_type?: AgentType;
}
/**
 * SessionStart hook output
 */
export interface SessionStartOutput extends HookOutput {
    hookSpecificOutput?: {
        hookEventName: 'SessionStart';
        additionalContext?: string;
    };
}
/**
 * SessionEnd reason types
 */
export declare enum SessionEndReason {
    Clear = "clear",
    Logout = "logout",
    PromptInputExit = "prompt_input_exit",
    Bypass_permissions_disabled = "bypass_permissions_disabled",
    Other = "other"
}
/**
 * SessionEnd hook input
 */
export interface SessionEndInput extends HookInput {
    reason: SessionEndReason;
}
/**
 * SessionEnd hook output
 */
export interface SessionEndOutput extends HookOutput {
    hookSpecificOutput?: {
        hookEventName: 'SessionEnd';
        additionalContext?: string;
    };
}
/**
 * PreCompress trigger types
 */
export declare enum PreCompactTrigger {
    Manual = "manual",
    Auto = "auto"
}
/**
 * PreCompress hook input
 */
export interface PreCompactInput extends HookInput {
    trigger: PreCompactTrigger;
    custom_instructions: string;
}
/**
 * PreCompress hook output
 */
export interface PreCompactOutput extends HookOutput {
    hookSpecificOutput?: {
        hookEventName: 'PreCompact';
        additionalContext: string;
    };
}
export declare enum AgentType {
    Bash = "Bash",
    Explorer = "Explorer",
    Plan = "Plan",
    Custom = "Custom"
}
/**
 * SubagentStart hook input
 * Fired when a subagent (Agent tool call) is spawned
 */
export interface SubagentStartInput extends HookInput {
    permission_mode: PermissionMode;
    agent_id: string;
    agent_type: AgentType | string;
}
/**
 * SubagentStart hook output
 */
export interface SubagentStartOutput extends HookOutput {
    hookSpecificOutput?: {
        hookEventName: 'SubagentStart';
        additionalContext?: string;
    };
}
/**
 * SubagentStop hook input
 * Fired when a subagent has finished responding
 */
export interface SubagentStopInput extends HookInput {
    permission_mode: PermissionMode;
    stop_hook_active: boolean;
    agent_id: string;
    agent_type: AgentType | string;
    agent_transcript_path: string;
    last_assistant_message: string;
}
/**
 * SubagentStop hook output
 * Supports all three hook types: command, prompt, and agent
 */
export interface SubagentStopOutput extends HookOutput {
    hookSpecificOutput?: {
        hookEventName: 'SubagentStop';
        additionalContext?: string;
    };
}
/**
 * Hook execution result
 */
export interface HookExecutionResult {
    hookConfig: HookConfig;
    eventName: HookEventName;
    success: boolean;
    output?: HookOutput;
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    duration: number;
    error?: Error;
}
/**
 * Hook execution plan for an event
 */
export interface HookExecutionPlan {
    eventName: HookEventName;
    hookConfigs: HookConfig[];
    sequential: boolean;
}
