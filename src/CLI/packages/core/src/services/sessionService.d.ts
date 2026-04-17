/**
 * @license
 * Copyright 2025 Qwen Code
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Content } from '@google/genai';
import type { ChatRecord } from './chatRecordingService.js';
/**
 * Session item for list display.
 * Contains essential info extracted from the first record of a session file.
 */
export interface SessionListItem {
    /** Unique session identifier */
    sessionId: string;
    /** Working directory at session start */
    cwd: string;
    /** ISO 8601 timestamp when session started */
    startTime: string;
    /** File modification time (used for ordering and pagination) */
    mtime: number;
    /** First user prompt text (truncated for display) */
    prompt: string;
    /** Git branch at session start, if available */
    gitBranch?: string;
    /** Full path to the session file */
    filePath: string;
    /** Number of messages in the session (unique message UUIDs) */
    messageCount: number;
}
/**
 * Pagination options for listing sessions.
 */
export interface ListSessionsOptions {
    /**
     * Cursor for pagination (mtime of the last item from previous page).
     * Items with mtime < cursor will be returned.
     * If undefined, starts from the most recent.
     */
    cursor?: number;
    /**
     * Maximum number of items to return.
     * @default 20
     */
    size?: number;
}
/**
 * Result of listing sessions with pagination info.
 */
export interface ListSessionsResult {
    /** Session items for this page */
    items: SessionListItem[];
    /**
     * Cursor for next page (mtime of last item).
     * Undefined if no more items.
     */
    nextCursor?: number;
    /** Whether there are more items after this page */
    hasMore: boolean;
}
/**
 * Complete conversation reconstructed from ChatRecords.
 * Used for resuming sessions and API compatibility.
 */
export interface ConversationRecord {
    sessionId: string;
    projectHash: string;
    startTime: string;
    lastUpdated: string;
    /** Messages in chronological order (reconstructed from tree) */
    messages: ChatRecord[];
}
/**
 * Data structure for resuming an existing session.
 */
export interface ResumedSessionData {
    conversation: ConversationRecord;
    filePath: string;
    /** UUID of the last completed message - new messages should use this as parentUuid */
    lastCompletedUuid: string | null;
}
/**
 * Service for managing chat sessions.
 *
 * This service handles:
 * - Listing sessions with pagination (ordered by mtime)
 * - Loading full session data for resumption
 * - Removing sessions
 *
 * Sessions are stored as JSONL files, one per session.
 * File location: ~/.aether/tmp/<project_id>/chats/
 */
export declare class SessionService {
    private readonly storage;
    private readonly projectHash;
    constructor(cwd: string);
    private getChatsDir;
    /**
     * Extracts the first user prompt text from a Content object.
     */
    private extractPromptText;
    /**
     * Finds the first available prompt text by scanning the first N records,
     * preferring user messages. Returns an empty string if none found.
     */
    private extractFirstPromptFromRecords;
    /**
     * Counts unique message UUIDs in a session file.
     * This gives the number of logical messages in the session.
     */
    private countSessionMessages;
    /**
     * Lists sessions for the current project with pagination.
     *
     * Sessions are ordered by file modification time (most recent first).
     * Uses cursor-based pagination with mtime as the cursor.
     *
     * Only reads the first line of each JSONL file for efficiency.
     * Files are filtered by UUID pattern first, then by project hash.
     *
     * @param options Pagination options
     * @returns Paginated list of sessions
     */
    listSessions(options?: ListSessionsOptions): Promise<ListSessionsResult>;
    /**
     * Reads all records from a session file.
     */
    private readAllRecords;
    /**
     * Aggregates multiple records with the same uuid into a single ChatRecord.
     * Merges content fields (message, tokens, model, toolCallResult).
     */
    private aggregateRecords;
    /**
     * Reconstructs a linear conversation from tree-structured records.
     */
    private reconstructHistory;
    /**
     * Loads a session by its session ID.
     * Reconstructs the full conversation from tree-structured records.
     *
     * @param sessionId The session ID to load
     * @returns Session data for resumption, or null if not found
     */
    loadSession(sessionId: string): Promise<ResumedSessionData | undefined>;
    /**
     * Removes a session by its session ID.
     *
     * @param sessionId The session ID to remove
     * @returns true if removed, false if not found
     */
    removeSession(sessionId: string): Promise<boolean>;
    /**
     * Loads the most recent session for the current project.
     * Combines listSessions and loadSession for convenience.
     *
     * @returns Session data for resumption, or undefined if no sessions exist
     */
    loadLastSession(): Promise<ResumedSessionData | undefined>;
    /**
     * Checks if a session exists by its session ID.
     *
     * @param sessionId The session ID to check
     * @returns true if session exists and belongs to current project
     */
    sessionExists(sessionId: string): Promise<boolean>;
}
/**
 * Options for building API history from conversation.
 */
export interface BuildApiHistoryOptions {
    /**
     * Whether to strip thought parts from the history.
     * Thought parts are content parts that have `thought: true`.
     * @default true
     */
    stripThoughtsFromHistory?: boolean;
}
/**
 * Builds the model-facing chat history (Content[]) from a reconstructed
 * conversation. This keeps UI history intact while applying chat compression
 * checkpoints for the API history used on resume.
 *
 * Strategy:
 * - Find the latest system/chat_compression record (if any).
 * - Use its compressedHistory snapshot as the base history.
 * - Append all messages after that checkpoint (skipping system records).
 * - If no checkpoint exists, return the linear message list (message field only).
 */
export declare function buildApiHistoryFromConversation(conversation: ConversationRecord, options?: BuildApiHistoryOptions): Content[];
/**
 * Replays stored UI telemetry events to rebuild metrics when resuming a session.
 * Also restores the last prompt token count from the best available source.
 */
export declare function replayUiTelemetryFromConversation(conversation: ConversationRecord): void;
/**
 * Returns the best available prompt token count for resuming telemetry:
 * - If a chat compression checkpoint exists, use its new token count.
 * - Otherwise, use the last assistant usageMetadata input (fallback to total).
 */
export declare function getResumePromptTokenCount(conversation: ConversationRecord): number | undefined;
