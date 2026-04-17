/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Content, GenerateContentConfig, GenerateContentResponse, PartListUnion } from '@google/genai';
import { type Config } from '../config/config.js';
import { LoopDetectionService } from '../services/loopDetectionService.js';
import { GeminiChat } from './geminiChat.js';
import { type ChatCompressionInfo, type ServerGeminiStreamEvent, Turn } from './turn.js';
export declare enum SendMessageType {
    UserQuery = "userQuery",
    ToolResult = "toolResult",
    Retry = "retry",
    Hook = "hook",
    /** Cron-fired prompt. Behaves like UserQuery but skips UserPromptSubmit hook. */
    Cron = "cron"
}
export interface SendMessageOptions {
    type: SendMessageType;
    /** Track stop hook iterations to prevent infinite loops and display loop info */
    stopHookState?: {
        iterationCount: number;
        reasons: string[];
    };
}
export declare class GeminiClient {
    private readonly config;
    private chat?;
    private sessionTurnCount;
    private readonly loopDetector;
    private lastPromptId;
    private lastSentIdeContext;
    private forceFullIdeContext;
    /**
     * At any point in this conversation, was compression triggered without
     * being forced and did it fail?
     */
    private hasFailedCompressionAttempt;
    constructor(config: Config);
    initialize(): Promise<void>;
    private getContentGeneratorOrFail;
    addHistory(content: Content): Promise<void>;
    getChat(): GeminiChat;
    isInitialized(): boolean;
    getHistory(curated?: boolean): Content[];
    stripThoughtsFromHistory(): void;
    private stripOrphanedUserEntriesFromHistory;
    setHistory(history: Content[]): void;
    setTools(): void;
    resetChat(): Promise<void>;
    getLoopDetectionService(): LoopDetectionService;
    addDirectoryContext(): Promise<void>;
    private getMainSessionSystemInstruction;
    startChat(extraHistory?: Content[]): Promise<GeminiChat>;
    private getIdeContextParts;
    sendMessageStream(request: PartListUnion, signal: AbortSignal, prompt_id: string, options?: SendMessageOptions, turns?: number): AsyncGenerator<ServerGeminiStreamEvent, Turn>;
    generateContent(contents: Content[], generationConfig: GenerateContentConfig, abortSignal: AbortSignal, model: string, promptIdOverride?: string): Promise<GenerateContentResponse>;
    tryCompressChat(prompt_id: string, force?: boolean, signal?: AbortSignal): Promise<ChatCompressionInfo>;
}
export declare const TEST_ONLY: {
    COMPRESSION_PRESERVE_THRESHOLD: number;
    COMPRESSION_TOKEN_THRESHOLD: number;
};
