/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Content, GenerateContentConfig, GenerateContentResponse, Part, SendMessageParameters, Tool } from '@google/genai';
import type { Config } from '../config/config.js';
import type { ChatRecordingService } from '../services/chatRecordingService.js';
import type { UiTelemetryService } from '../telemetry/uiTelemetry.js';
import { type RetryInfo } from '../utils/rateLimit.js';
import type { StructuredError } from './turn.js';
export declare enum StreamEventType {
    /** A regular content chunk from the API. */
    CHUNK = "chunk",
    /** A signal that a retry is about to happen. The UI should discard any partial
     * content from the attempt that just failed. */
    RETRY = "retry"
}
export type StreamEvent = {
    type: StreamEventType.CHUNK;
    value: GenerateContentResponse;
} | {
    type: StreamEventType.RETRY;
    retryInfo?: RetryInfo;
};
export declare function isValidNonThoughtTextPart(part: Part): boolean;
/**
 * Custom error to signal that a stream completed with invalid content,
 * which should trigger a retry.
 */
export declare class InvalidStreamError extends Error {
    readonly type: 'NO_FINISH_REASON' | 'NO_RESPONSE_TEXT';
    constructor(message: string, type: 'NO_FINISH_REASON' | 'NO_RESPONSE_TEXT');
}
/**
 * Chat session that enables sending messages to the model with previous
 * conversation context.
 *
 * @remarks
 * The session maintains all the turns between user and model.
 */
export declare class GeminiChat {
    private readonly config;
    private readonly generationConfig;
    private history;
    private readonly chatRecordingService?;
    private readonly telemetryService?;
    private sendPromise;
    /**
     * Creates a new GeminiChat instance.
     *
     * @param config - The configuration object.
     * @param generationConfig - Optional generation configuration.
     * @param history - Optional initial conversation history.
     * @param chatRecordingService - Optional recording service. If provided, chat
     *   messages will be recorded.
     * @param telemetryService - Optional UI telemetry service. When provided,
     *   prompt token counts are reported on each API response. Pass `undefined`
     *   for sub-agent chats to avoid overwriting the main agent's context usage.
     */
    constructor(config: Config, generationConfig?: GenerateContentConfig, history?: Content[], chatRecordingService?: ChatRecordingService | undefined, telemetryService?: UiTelemetryService | undefined);
    setSystemInstruction(sysInstr: string): void;
    /**
     * Sends a message to the model and returns the response in chunks.
     *
     * @remarks
     * This method will wait for the previous message to be processed before
     * sending the next message.
     *
     * @see {@link Chat#sendMessage} for non-streaming method.
     * @param params - parameters for sending the message.
     * @return The model's response.
     *
     * @example
     * ```ts
     * const chat = ai.chats.create({model: 'gemini-2.0-flash'});
     * const response = await chat.sendMessageStream({
     * message: 'Why is the sky blue?'
     * });
     * for await (const chunk of response) {
     * console.log(chunk.text);
     * }
     * ```
     */
    sendMessageStream(model: string, params: SendMessageParameters, prompt_id: string): Promise<AsyncGenerator<StreamEvent>>;
    private makeApiCallAndProcessStream;
    /**
     * Returns the chat history.
     *
     * @remarks
     * The history is a list of contents alternating between user and model.
     *
     * There are two types of history:
     * - The `curated history` contains only the valid turns between user and
     * model, which will be included in the subsequent requests sent to the model.
     * - The `comprehensive history` contains all turns, including invalid or
     * empty model outputs, providing a complete record of the history.
     *
     * The history is updated after receiving the response from the model,
     * for streaming response, it means receiving the last chunk of the response.
     *
     * The `comprehensive history` is returned by default. To get the `curated
     * history`, set the `curated` parameter to `true`.
     *
     * @param curated - whether to return the curated history or the comprehensive
     * history.
     * @return History contents alternating between user and model for the entire
     * chat session.
     */
    getHistory(curated?: boolean): Content[];
    /**
     * Clears the chat history.
     */
    clearHistory(): void;
    /**
     * Adds a new entry to the chat history.
     */
    addHistory(content: Content): void;
    setHistory(history: Content[]): void;
    stripThoughtsFromHistory(): void;
    /**
     * Pop all orphaned trailing user entries from chat history.
     * In a valid conversation the last entry is always a model response;
     * any trailing user entries are leftovers from a request that failed.
     */
    stripOrphanedUserEntriesFromHistory(): void;
    setTools(tools: Tool[]): void;
    /** Returns a shallow copy of the current generation config (for cache param snapshots). */
    getGenerationConfig(): GenerateContentConfig;
    maybeIncludeSchemaDepthContext(error: StructuredError): Promise<void>;
    private processStreamResponse;
}
/** Visible for Testing */
export declare function isSchemaDepthError(errorMessage: string): boolean;
export declare function isInvalidArgumentError(errorMessage: string): boolean;
