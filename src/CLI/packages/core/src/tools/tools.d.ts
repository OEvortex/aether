/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { FunctionDeclaration, Part, PartListUnion } from '@google/genai';
import type { AgentStatsSummary } from '../agents/runtime/agent-statistics.js';
import type { DiffUpdateResult } from '../ide/ide-client.js';
import type { PermissionDecision } from '../permissions/types.js';
import type { ShellExecutionConfig } from '../services/shellExecutionService.js';
import type { AnsiOutput } from '../utils/terminalSerializer.js';
import { ToolErrorType } from './tool-error.js';
/**
 * Represents a validated and ready-to-execute tool call.
 * An instance of this is created by a `ToolBuilder`.
 */
export interface ToolInvocation<TParams extends object, TResult extends ToolResult> {
    /**
     * The validated parameters for this specific invocation.
     */
    params: TParams;
    /**
     * Gets a pre-execution description of the tool operation.
     *
     * @returns A markdown string describing what the tool will do.
     */
    getDescription(): string;
    /**
     * Determines what file system paths the tool will affect.
     * @returns A list of such paths.
     */
    toolLocations(): ToolLocation[];
    /**
     * Returns the tool's intrinsic permission for this invocation, based solely
     * on its own parameters (without consulting PermissionManager).
     *
     * - `'allow'` — inherently safe (e.g., read-only commands, `cat`, `ls`).
     * - `'ask'`   — may have side effects, needs user or PM confirmation.
     * - `'deny'`  — security violation (e.g., command substitution in shell).
     *
     * The coreToolScheduler uses this as the *default* permission which may be
     * overridden by PermissionManager rules at L4.
     */
    getDefaultPermission(): Promise<PermissionDecision>;
    /**
     * Constructs the confirmation dialog details for this invocation.
     * Only called when the final permission decision is `'ask'` and the user
     * needs to be prompted interactively.
     *
     * @param abortSignal Signal to cancel the operation.
     * @returns The confirmation details for the UI to display.
     */
    getConfirmationDetails(abortSignal: AbortSignal): Promise<ToolCallConfirmationDetails>;
    /**
     * Executes the tool with the validated parameters.
     * @param signal AbortSignal for tool cancellation.
     * @param updateOutput Optional callback to stream output.
     * @returns Result of the tool execution.
     */
    execute(signal: AbortSignal, updateOutput?: (output: ToolResultDisplay) => void, shellExecutionConfig?: ShellExecutionConfig): Promise<TResult>;
}
/**
 * A convenience base class for ToolInvocation.
 */
export declare abstract class BaseToolInvocation<TParams extends object, TResult extends ToolResult> implements ToolInvocation<TParams, TResult> {
    readonly params: TParams;
    constructor(params: TParams);
    abstract getDescription(): string;
    toolLocations(): ToolLocation[];
    /**
     * Default: read-only tools return 'allow'. Override in subclasses for
     * tools with side effects.
     */
    getDefaultPermission(): Promise<PermissionDecision>;
    /**
     * Default fallback: returns a generic 'info' confirmation dialog using the
     * tool's getDescription(). This ensures that even tools whose
     * getDefaultPermission() returns 'allow' can still be prompted when PM
     * rules override the decision to 'ask' at L4.
     *
     * Tools with richer confirmation UIs (Shell, Edit, MCP, etc.) override this.
     */
    getConfirmationDetails(_abortSignal: AbortSignal): Promise<ToolCallConfirmationDetails>;
    abstract execute(signal: AbortSignal, updateOutput?: (output: ToolResultDisplay) => void, shellExecutionConfig?: ShellExecutionConfig): Promise<TResult>;
}
/**
 * A type alias for a tool invocation where the specific parameter and result types are not known.
 */
export type AnyToolInvocation = ToolInvocation<object, ToolResult>;
/**
 * Interface for a tool builder that validates parameters and creates invocations.
 */
export interface ToolBuilder<TParams extends object, TResult extends ToolResult> {
    /**
     * The internal name of the tool (used for API calls).
     */
    name: string;
    /**
     * The user-friendly display name of the tool.
     */
    displayName: string;
    /**
     * Description of what the tool does.
     */
    description: string;
    /**
     * The kind of tool for categorization and permissions
     */
    kind: Kind;
    /**
     * Function declaration schema from @google/genai.
     */
    schema: FunctionDeclaration;
    /**
     * Whether the tool's output should be rendered as markdown.
     */
    isOutputMarkdown: boolean;
    /**
     * Whether the tool supports live (streaming) output.
     */
    canUpdateOutput: boolean;
    /**
     * Validates raw parameters and builds a ready-to-execute invocation.
     * @param params The raw, untrusted parameters from the model.
     * @returns A valid `ToolInvocation` if successful. Throws an error if validation fails.
     */
    build(params: TParams): ToolInvocation<TParams, TResult>;
}
/**
 * New base class for tools that separates validation from execution.
 * New tools should extend this class.
 */
export declare abstract class DeclarativeTool<TParams extends object, TResult extends ToolResult> implements ToolBuilder<TParams, TResult> {
    readonly name: string;
    readonly displayName: string;
    readonly description: string;
    readonly kind: Kind;
    readonly parameterSchema: unknown;
    readonly isOutputMarkdown: boolean;
    readonly canUpdateOutput: boolean;
    constructor(name: string, displayName: string, description: string, kind: Kind, parameterSchema: unknown, isOutputMarkdown?: boolean, canUpdateOutput?: boolean);
    get schema(): FunctionDeclaration;
    /**
     * Validates the raw tool parameters.
     * Subclasses should override this to add custom validation logic
     * beyond the JSON schema check.
     * @param params The raw parameters from the model.
     * @returns An error message string if invalid, null otherwise.
     */
    validateToolParams(_params: TParams): string | null;
    /**
     * The core of the new pattern. It validates parameters and, if successful,
     * returns a `ToolInvocation` object that encapsulates the logic for the
     * specific, validated call.
     * @param params The raw, untrusted parameters from the model.
     * @returns A `ToolInvocation` instance.
     */
    abstract build(params: TParams): ToolInvocation<TParams, TResult>;
    /**
     * A convenience method that builds and executes the tool in one step.
     * Throws an error if validation fails.
     * @param params The raw, untrusted parameters from the model.
     * @param signal AbortSignal for tool cancellation.
     * @param updateOutput Optional callback to stream output.
     * @returns The result of the tool execution.
     */
    buildAndExecute(params: TParams, signal: AbortSignal, updateOutput?: (output: ToolResultDisplay) => void, shellExecutionConfig?: ShellExecutionConfig): Promise<TResult>;
    /**
     * Similar to `build` but never throws.
     * @param params The raw, untrusted parameters from the model.
     * @returns A `ToolInvocation` instance.
     */
    private silentBuild;
    /**
     * A convenience method that builds and executes the tool in one step.
     * Never throws.
     * @param params The raw, untrusted parameters from the model.
     * @params abortSignal a signal to abort.
     * @returns The result of the tool execution.
     */
    validateBuildAndExecute(params: TParams, abortSignal: AbortSignal): Promise<ToolResult>;
}
/**
 * New base class for declarative tools that separates validation from execution.
 * New tools should extend this class, which provides a `build` method that
 * validates parameters before deferring to a `createInvocation` method for
 * the final `ToolInvocation` object instantiation.
 */
export declare abstract class BaseDeclarativeTool<TParams extends object, TResult extends ToolResult> extends DeclarativeTool<TParams, TResult> {
    build(params: TParams): ToolInvocation<TParams, TResult>;
    validateToolParams(params: TParams): string | null;
    protected validateToolParamValues(_params: TParams): string | null;
    protected abstract createInvocation(params: TParams): ToolInvocation<TParams, TResult>;
}
/**
 * A type alias for a declarative tool where the specific parameter and result types are not known.
 */
export type AnyDeclarativeTool = DeclarativeTool<object, ToolResult>;
/**
 * Type guard to check if an object is a Tool.
 * @param obj The object to check.
 * @returns True if the object is a Tool, false otherwise.
 */
export declare function isTool(obj: unknown): obj is AnyDeclarativeTool;
export interface ToolResult {
    /**
     * Content meant to be included in LLM history.
     * This should represent the factual outcome of the tool execution.
     */
    llmContent: PartListUnion;
    /**
     * Markdown string for user display.
     * This provides a user-friendly summary or visualization of the result.
     * NOTE: This might also be considered UI-specific and could potentially be
     * removed or modified in a further refactor if the server becomes purely API-driven.
     * For now, we keep it as the core logic in ReadFileTool currently produces it.
     */
    returnDisplay: ToolResultDisplay;
    /**
     * If this property is present, the tool call is considered a failure.
     */
    error?: {
        message: string;
        type?: ToolErrorType;
    };
}
/**
 * Detects cycles in a JSON schemas due to `$ref`s.
 * @param schema The root of the JSON schema.
 * @returns `true` if a cycle is detected, `false` otherwise.
 */
export declare function hasCycleInSchema(schema: object): boolean;
export interface AgentResultDisplay {
    type: 'task_execution';
    subagentName: string;
    subagentColor?: string;
    taskDescription: string;
    taskPrompt: string;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    terminateReason?: string;
    result?: string;
    executionSummary?: AgentStatsSummary;
    pendingConfirmation?: ToolCallConfirmationDetails;
    toolCalls?: Array<{
        callId: string;
        name: string;
        status: 'executing' | 'awaiting_approval' | 'success' | 'failed';
        error?: string;
        args?: Record<string, unknown>;
        result?: string;
        resultDisplay?: string;
        responseParts?: Part[];
        description?: string;
    }>;
}
export interface AnsiOutputDisplay {
    ansiOutput: AnsiOutput;
}
/**
 * Structured progress data following the MCP notifications/progress spec.
 * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/utilities/progress
 */
export interface McpToolProgressData {
    type: 'mcp_tool_progress';
    /** Current progress value (must increase with each notification) */
    progress: number;
    /** Optional total value indicating the operation's target */
    total?: number;
    /** Optional human-readable progress message */
    message?: string;
}
export type ToolResultDisplay = string | FileDiff | TodoResultDisplay | PlanResultDisplay | AgentResultDisplay | AnsiOutputDisplay | McpToolProgressData;
export interface FileDiff {
    fileDiff: string;
    fileName: string;
    originalContent: string | null;
    newContent: string;
    diffStat?: DiffStat;
}
export interface DiffStat {
    model_added_lines: number;
    model_removed_lines: number;
    model_added_chars: number;
    model_removed_chars: number;
    user_added_lines: number;
    user_removed_lines: number;
    user_added_chars: number;
    user_removed_chars: number;
}
export interface TodoResultDisplay {
    type: 'todo_list';
    todos: Array<{
        id: string;
        content: string;
        status: 'pending' | 'in_progress' | 'completed';
    }>;
}
export interface PlanResultDisplay {
    type: 'plan_summary';
    message: string;
    plan: string;
    rejected?: boolean;
}
export interface ToolEditConfirmationDetails {
    type: 'edit';
    title: string;
    onConfirm: (outcome: ToolConfirmationOutcome, payload?: ToolConfirmationPayload) => Promise<void>;
    /**
     * When true, the UI should not show "Always allow" options (ProceedAlwaysProject/User).
     * Set by coreToolScheduler when PM has an explicit 'ask' rule that would override
     * any 'allow' rule the user might add.
     */
    hideAlwaysAllow?: boolean;
    fileName: string;
    filePath: string;
    fileDiff: string;
    originalContent: string | null;
    newContent: string;
    isModifying?: boolean;
    ideConfirmation?: Promise<DiffUpdateResult>;
}
export interface ToolConfirmationPayload {
    newContent?: string;
    cancelMessage?: string;
    permissionRules?: string[];
    answers?: Record<string, string>;
}
export interface ToolExecuteConfirmationDetails {
    type: 'exec';
    title: string;
    onConfirm: (outcome: ToolConfirmationOutcome, payload?: ToolConfirmationPayload) => Promise<void>;
    /** @see ToolEditConfirmationDetails.hideAlwaysAllow */
    hideAlwaysAllow?: boolean;
    command: string;
    rootCommand: string;
    /** Permission rules extracted by extractCommandRules(), used for display and persistence. */
    permissionRules?: string[];
}
export interface ToolMcpConfirmationDetails {
    type: 'mcp';
    title: string;
    /** @see ToolEditConfirmationDetails.hideAlwaysAllow */
    hideAlwaysAllow?: boolean;
    serverName: string;
    toolName: string;
    toolDisplayName: string;
    onConfirm: (outcome: ToolConfirmationOutcome, payload?: ToolConfirmationPayload) => Promise<void>;
    /** Permission rule for this MCP tool, e.g. 'mcp__server__tool'. */
    permissionRules?: string[];
}
export interface ToolInfoConfirmationDetails {
    type: 'info';
    title: string;
    onConfirm: (outcome: ToolConfirmationOutcome, payload?: ToolConfirmationPayload) => Promise<void>;
    /** @see ToolEditConfirmationDetails.hideAlwaysAllow */
    hideAlwaysAllow?: boolean;
    prompt: string;
    urls?: string[];
    /** Permission rules for persistence, e.g. 'WebFetch(example.com)'. */
    permissionRules?: string[];
}
export type ToolCallConfirmationDetails = ToolEditConfirmationDetails | ToolExecuteConfirmationDetails | ToolMcpConfirmationDetails | ToolInfoConfirmationDetails | ToolPlanConfirmationDetails | ToolAskUserQuestionConfirmationDetails;
export interface ToolPlanConfirmationDetails {
    type: 'plan';
    title: string;
    /** @see ToolEditConfirmationDetails.hideAlwaysAllow */
    hideAlwaysAllow?: boolean;
    plan: string;
    onConfirm: (outcome: ToolConfirmationOutcome, payload?: ToolConfirmationPayload) => Promise<void>;
}
export interface ToolAskUserQuestionConfirmationDetails {
    type: 'ask_user_question';
    title: string;
    questions: Array<{
        question: string;
        header: string;
        options: Array<{
            label: string;
            description: string;
        }>;
        multiSelect: boolean;
    }>;
    metadata?: {
        source?: string;
    };
    onConfirm: (outcome: ToolConfirmationOutcome, payload?: ToolConfirmationPayload) => Promise<void>;
}
/**
 * TODO:
 * 1. support explicit denied outcome
 * 2. support proceed with modified input
 */
export declare enum ToolConfirmationOutcome {
    ProceedOnce = "proceed_once",
    ProceedAlways = "proceed_always",
    /** @deprecated Use ProceedAlwaysProject or ProceedAlwaysUser instead. */
    ProceedAlwaysServer = "proceed_always_server",
    /** @deprecated Use ProceedAlwaysProject or ProceedAlwaysUser instead. */
    ProceedAlwaysTool = "proceed_always_tool",
    /** Persist the permission rule to the project settings (workspace scope). */
    ProceedAlwaysProject = "proceed_always_project",
    /** Persist the permission rule to the user settings (user scope). */
    ProceedAlwaysUser = "proceed_always_user",
    ModifyWithEditor = "modify_with_editor",
    Cancel = "cancel"
}
export declare enum Kind {
    Read = "read",
    Edit = "edit",
    Delete = "delete",
    Move = "move",
    Search = "search",
    Execute = "execute",
    Think = "think",
    Fetch = "fetch",
    Other = "other"
}
export declare const MUTATOR_KINDS: Kind[];
export interface ToolLocation {
    path: string;
    line?: number;
}
