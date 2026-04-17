/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Type definition for the result of parsing a JSON chunk in tool calls
 */
export interface ToolCallParseResult {
    /** Whether the JSON parsing is complete */
    complete: boolean;
    /** The parsed JSON value (only present when complete is true) */
    value?: Record<string, unknown>;
    /** Error information if parsing failed */
    error?: Error;
    /** Whether the JSON was repaired (e.g., auto-closed unclosed strings) */
    repaired?: boolean;
}
/**
 * StreamingToolCallParser - Handles streaming tool call objects with inconsistent chunk formats
 *
 * Problems this parser addresses:
 * - Tool calls arrive with varying chunk shapes (empty strings, partial JSON, complete objects)
 * - Tool calls may lack IDs, names, or have inconsistent indices
 * - Multiple tool calls can be processed simultaneously with interleaved chunks
 * - Index collisions occur when the same index is reused for different tool calls
 * - JSON arguments are fragmented across multiple chunks and need reconstruction
 */
export declare class StreamingToolCallParser {
    /** Accumulated buffer containing all received chunks for each tool call index */
    private buffers;
    /** Current nesting depth in JSON structure for each tool call index */
    private depths;
    /** Whether we're currently inside a string literal for each tool call index */
    private inStrings;
    /** Whether the next character should be treated as escaped for each tool call index */
    private escapes;
    /** Metadata for each tool call index */
    private toolCallMeta;
    /** Map from tool call ID to actual index used for storage */
    private idToIndexMap;
    /** Counter for generating new indices when collisions occur */
    private nextAvailableIndex;
    /**
     * Processes a new chunk of tool call data and attempts to parse complete JSON objects
     *
     * Handles the core problems of streaming tool call parsing:
     * - Resolves index collisions when the same index is reused for different tool calls
     * - Routes chunks without IDs to the correct incomplete tool call
     * - Tracks JSON parsing state (depth, string boundaries, escapes) per tool call
     * - Attempts parsing only when JSON structure is complete (depth = 0)
     * - Repairs common issues like unclosed strings
     *
     * @param index - Tool call index from streaming response (may collide with existing calls)
     * @param chunk - String chunk that may be empty, partial JSON, or complete data
     * @param id - Optional tool call ID for collision detection and chunk routing
     * @param name - Optional function name stored as metadata
     * @returns ToolCallParseResult with completion status, parsed value, and repair info
     */
    addChunk(index: number, chunk: string, id?: string, name?: string): ToolCallParseResult;
    /**
     * Gets the current tool call metadata for a specific index
     *
     * @param index - The tool call index
     * @returns Object containing id and name if available
     */
    getToolCallMeta(index: number): {
        id?: string;
        name?: string;
    };
    /**
     * Gets all completed tool calls that are ready to be emitted
     *
     * Attempts to parse accumulated buffers using multiple strategies:
     * 1. Standard JSON.parse()
     * 2. Auto-close unclosed strings and retry
     * 3. Fallback to safeJsonParse for malformed data
     *
     * Only returns tool calls with both name metadata and non-empty buffers.
     * Should be called when streaming is complete (finish_reason is present).
     *
     * @returns Array of completed tool calls with their metadata and parsed arguments
     */
    getCompletedToolCalls(): Array<{
        id?: string;
        name?: string;
        args: Record<string, unknown>;
        index: number;
    }>;
    /**
     * Finds the next available index for a new tool call
     *
     * Scans indices starting from nextAvailableIndex to find one that's safe to use.
     * Reuses indices with empty buffers or incomplete parsing states.
     * Skips indices with complete, parseable tool call data to prevent overwriting.
     *
     * @returns The next available index safe for storing a new tool call
     */
    private findNextAvailableIndex;
    /**
     * Finds the most recent incomplete tool call index
     *
     * Used when continuation chunks arrive without IDs. Scans existing tool calls
     * to find the highest index with incomplete parsing state (depth > 0, empty buffer,
     * or unparseable JSON). Falls back to creating a new index if none found.
     *
     * @returns The index of the most recent incomplete tool call, or a new available index
     */
    private findMostRecentIncompleteIndex;
    /**
     * Resets the parser state for a specific tool call index
     *
     * @param index - The tool call index to reset
     */
    resetIndex(index: number): void;
    /**
     * Resets the entire parser state for processing a new stream
     *
     * Clears all accumulated buffers, parsing states, metadata, and counters.
     * Allows the parser to be reused for multiple independent streams without
     * data leakage between sessions.
     */
    reset(): void;
    /**
     * Gets the current accumulated buffer content for a specific index
     *
     * @param index - The tool call index to retrieve buffer for
     * @returns The current buffer content for the specified index (empty string if not found)
     */
    getBuffer(index: number): string;
    /**
     * Gets the current parsing state information for a specific index
     *
     * @param index - The tool call index to get state information for
     * @returns Object containing current parsing state (depth, inString, escape)
     */
    getState(index: number): {
        depth: number;
        inString: boolean;
        escape: boolean;
    };
    /**
     * Checks whether any buffered tool call has incomplete JSON at stream end.
     *
     * A tool call is considered incomplete when its JSON parsing state indicates
     * the buffer was truncated mid-stream:
     * - depth > 0: unclosed braces/brackets remain
     * - inString === true: still inside a string literal
     *
     * This is critical for detecting output truncation that the LLM provider
     * may not report correctly via finish_reason (e.g. reporting "stop" or
     * "tool_calls" instead of "length" when output was actually cut off).
     *
     * @returns true if at least one tool call buffer has incomplete JSON
     */
    hasIncompleteToolCalls(): boolean;
}
