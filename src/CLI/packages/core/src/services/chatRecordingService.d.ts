/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type Content, type GenerateContentResponseUsageMetadata, type PartListUnion } from '@google/genai';
import type { Config } from '../config/config.js';
import type { Status } from '../core/coreToolScheduler.js';
import type { ChatCompressionInfo, ToolCallResponseInfo } from '../core/turn.js';
import type { UiEvent } from '../telemetry/uiTelemetry.js';
/**
 * A single record stored in the JSONL file.
 * Forms a tree structure via uuid/parentUuid for future checkpointing support.
 *
 * Each record is self-contained with full metadata, enabling:
 * - Append-only writes (crash-safe)
 * - Tree reconstruction by following parentUuid chain
 * - Future checkpointing by branching from any historical record
 */
export interface ChatRecord {
    /** Unique identifier for this logical message */
    uuid: string;
    /** UUID of the parent message; null for root (first message in session) */
    parentUuid: string | null;
    /** Session identifier - groups records into a logical conversation */
    sessionId: string;
    /** ISO 8601 timestamp of when the record was created */
    timestamp: string;
    /**
     * Message type: user input, assistant response, tool result, or system event.
     * System records are append-only events that can alter how history is reconstructed
     * (e.g., chat compression checkpoints) while keeping the original UI history intact.
     */
    type: 'user' | 'assistant' | 'tool_result' | 'system';
    /** Optional system subtype for distinguishing system behaviors */
    subtype?: 'chat_compression' | 'slash_command' | 'ui_telemetry' | 'at_command';
    /** Working directory at time of message */
    cwd: string;
    /** CLI version for compatibility tracking */
    version: string;
    /** Current git branch, if available */
    gitBranch?: string;
    /**
     * The actual Content object (role + parts) sent to/from LLM.
     * This is stored in the exact format needed for API calls, enabling
     * direct aggregation into Content[] for session resumption.
     * Contains: text, functionCall, functionResponse, thought parts, etc.
     */
    message?: Content;
    /** Token usage statistics */
    usageMetadata?: GenerateContentResponseUsageMetadata;
    /** Model used for this response */
    model?: string;
    /** Context window size of the model used for this response */
    contextWindowSize?: number;
    /**
     * Tool call metadata for UI recovery.
     * Contains enriched info (displayName, status, result, etc.) not in API format.
     */
    toolCallResult?: Partial<ToolCallResponseInfo>;
    /**
     * Payload for system records. For chat compression, this stores all data needed
     * to reconstruct the compressed history without mutating the original UI list.
     */
    systemPayload?: ChatCompressionRecordPayload | SlashCommandRecordPayload | UiTelemetryRecordPayload | AtCommandRecordPayload;
}
/**
 * Stored payload for chat compression checkpoints. This allows us to rebuild the
 * effective chat history on resume while keeping the original UI-visible history.
 */
export interface ChatCompressionRecordPayload {
    /** Compression metrics/status returned by the compression service */
    info: ChatCompressionInfo;
    /**
     * Snapshot of the new history contents that the model should see after
     * compression (summary turns + retained tail). Stored as Content[] for
     * resume reconstruction.
     */
    compressedHistory: Content[];
}
export interface SlashCommandRecordPayload {
    /** Whether this record represents the invocation or the resulting output. */
    phase: 'invocation' | 'result';
    /** Raw user-entered slash command (e.g., "/about"). */
    rawCommand: string;
    /**
     * History items the UI displayed for this command, in the same shape used by
     * the CLI (without IDs). Stored as plain objects for replay on resume.
     */
    outputHistoryItems?: Array<Record<string, unknown>>;
}
/**
 * Stored payload for @-command replay.
 */
export interface AtCommandRecordPayload {
    /** Files that were read for this @-command. */
    filesRead: string[];
    /** Status for UI reconstruction. */
    status: 'success' | 'error';
    /** Optional result message for UI reconstruction. */
    message?: string;
    /** Raw user-entered @-command query (optional for legacy records). */
    userText?: string;
}
/**
 * Stored payload for UI telemetry replay.
 */
export interface UiTelemetryRecordPayload {
    uiEvent: UiEvent;
}
/**
 * Service for recording the current chat session to disk.
 *
 * This service provides comprehensive conversation recording that captures:
 * - All user and assistant messages
 * - Tool calls and their execution results
 * - Token usage statistics
 * - Assistant thoughts and reasoning
 *
 * **API Design:**
 * - `recordUserMessage()` - Records a user message (immediate write)
 * - `recordAssistantTurn()` - Records an assistant turn with all data (immediate write)
 * - `recordToolResult()` - Records tool results (immediate write)
 *
 * **Storage Format:** JSONL files with tree-structured records.
 * Each record has uuid/parentUuid fields enabling:
 * - Append-only writes (never rewrite the file)
 * - Linear history reconstruction
 * - Future checkpointing (branch from any historical point)
 *
 * File location: ~/.aether/tmp/<project_id>/chats/
 *
 * For session management (list, load, remove), use SessionService.
 */
export declare class ChatRecordingService {
    /** UUID of the last written record in the chain */
    private lastRecordUuid;
    private readonly config;
    constructor(config: Config);
    /**
     * Returns the session ID.
     * @returns The session ID.
     */
    private getSessionId;
    /**
     * Ensures the chats directory exists, creating it if it doesn't exist.
     * @returns The path to the chats directory.
     * @throws Error if the directory cannot be created.
     */
    private ensureChatsDir;
    /**
     * Ensures the conversation file exists, creating it if it doesn't exist.
     * Uses atomic file creation to avoid race conditions.
     * @returns The path to the conversation file.
     * @throws Error if the file cannot be created or accessed.
     */
    private ensureConversationFile;
    /**
     * Creates base fields for a ChatRecord.
     */
    private createBaseRecord;
    /**
     * Appends a record to the session file and updates lastRecordUuid.
     */
    private appendRecord;
    /**
     * Records a user message.
     * Writes immediately to disk.
     *
     * @param message The raw PartListUnion object as used with the API
     */
    recordUserMessage(message: PartListUnion): void;
    /**
     * Records an assistant turn with all available data.
     * Writes immediately to disk.
     *
     * @param data.message The raw PartListUnion object from the model response
     * @param data.model The model name
     * @param data.tokens Token usage statistics
     * @param data.contextWindowSize Context window size of the model
     * @param data.toolCallsMetadata Enriched tool call info for UI recovery
     */
    recordAssistantTurn(data: {
        model: string;
        message?: PartListUnion;
        tokens?: GenerateContentResponseUsageMetadata;
        contextWindowSize?: number;
    }): void;
    /**
     * Records tool results (function responses) sent back to the model.
     * Writes immediately to disk.
     *
     * @param message The raw PartListUnion object with functionResponse parts
     * @param toolCallResult Optional tool call result info for UI recovery
     */
    recordToolResult(message: PartListUnion, toolCallResult?: Partial<ToolCallResponseInfo> & {
        status: Status;
    }): void;
    /**
     * Records a slash command invocation as a system record. This keeps the model
     * history clean while allowing resume to replay UI output for commands like
     * /about.
     */
    recordSlashCommand(payload: SlashCommandRecordPayload): void;
    /**
     * Records a chat compression checkpoint as a system record. This keeps the UI
     * history immutable while allowing resume/continue flows to reconstruct the
     * compressed model-facing history from the stored snapshot.
     */
    recordChatCompression(payload: ChatCompressionRecordPayload): void;
    /**
     * Records a UI telemetry event for replaying metrics on resume.
     */
    recordUiTelemetryEvent(uiEvent: UiEvent): void;
    /**
     * Records @-command metadata as a system record for UI reconstruction.
     */
    recordAtCommand(payload: AtCommandRecordPayload): void;
}
