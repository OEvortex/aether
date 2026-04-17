/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { HttpsProxyAgent } from 'https-proxy-agent';
import type { Config } from '../../config/config.js';
import type { ApiCancelEvent, ApiErrorEvent, ApiRequestEvent, ApiResponseEvent, ArenaAgentCompletedEvent, ArenaSessionEndedEvent, ArenaSessionStartedEvent, AuthEvent, ChatCompressionEvent, ContentRetryEvent, ContentRetryFailureEvent, ConversationFinishedEvent, EndSessionEvent, ExtensionDisableEvent, ExtensionEnableEvent, ExtensionInstallEvent, ExtensionUninstallEvent, ExtensionUpdateEvent, FileOperationEvent, FlashFallbackEvent, HookCallEvent, IdeConnectionEvent, InvalidChunkEvent, KittySequenceOverflowEvent, LoopDetectedEvent, MalformedJsonResponseEvent, ModelSlashCommandEvent, NextSpeakerCheckEvent, RipgrepFallbackEvent, SkillLaunchEvent, SlashCommandEvent, StartSessionEvent, SubagentExecutionEvent, ToolCallEvent, ToolOutputTruncatedEvent, UserFeedbackEvent, UserPromptEvent, UserRetryEvent } from '../types.js';
import type { RumActionEvent, RumEvent, RumExceptionEvent, RumPayload, RumResourceEvent, RumViewEvent } from './event-types.js';
export interface LogResponse {
    nextRequestWaitMs?: number;
}
export declare class AetherLogger {
    private static instance;
    private config?;
    private debugLogger;
    private readonly installationManager;
    /**
     * Queue of pending events that need to be flushed to the server. New events
     * are added to this queue and then flushed on demand (via `flushToRum`)
     */
    private readonly events;
    /**
     * The last time that the events were successfully flushed to the server.
     */
    private lastFlushTime;
    private userId;
    private sessionId;
    /**
     * Cached source information read from source.json.
     * Only read once at session start to avoid repeated file I/O.
     */
    private sourceInfo;
    /**
     * The value is true when there is a pending flush happening. This prevents
     * concurrent flush operations.
     */
    private isFlushInProgress;
    /**
     * This value is true when a flush was requested during an ongoing flush.
     */
    private pendingFlush;
    /**
     * Timestamp of the last network error log to prevent log spam.
     */
    private lastErrorLogTime;
    private constructor();
    private generateUserId;
    static getInstance(config?: Config): AetherLogger | undefined;
    enqueueLogEvent(event: RumEvent): void;
    createRumEvent(eventType: 'view' | 'action' | 'exception' | 'resource', type: string, name: string, properties: Partial<RumEvent>): RumEvent;
    createViewEvent(type: string, name: string, properties: Partial<RumViewEvent>): RumEvent;
    createActionEvent(type: string, name: string, properties: Partial<RumActionEvent>): RumEvent;
    createResourceEvent(type: string, name: string, properties: Partial<RumResourceEvent>): RumEvent;
    createExceptionEvent(type: string, name: string, properties: Partial<RumExceptionEvent>): RumEvent;
    private getOsMetadata;
    createRumPayload(): Promise<RumPayload>;
    flushIfNeeded(): void;
    readSourceInfo(): string;
    flushToRum(): Promise<LogResponse>;
    logStartSessionEvent(event: StartSessionEvent): Promise<void>;
    logEndSessionEvent(_event: EndSessionEvent): void;
    logConversationFinishedEvent(event: ConversationFinishedEvent): void;
    logNewPromptEvent(event: UserPromptEvent): void;
    logRetryEvent(event: UserRetryEvent): void;
    logSlashCommandEvent(event: SlashCommandEvent): void;
    logModelSlashCommandEvent(event: ModelSlashCommandEvent): void;
    logToolCallEvent(event: ToolCallEvent): void;
    logFileOperationEvent(event: FileOperationEvent): void;
    logSubagentExecutionEvent(event: SubagentExecutionEvent): void;
    logToolOutputTruncatedEvent(event: ToolOutputTruncatedEvent): void;
    logApiRequestEvent(event: ApiRequestEvent): void;
    logApiResponseEvent(event: ApiResponseEvent): void;
    logApiCancelEvent(event: ApiCancelEvent): void;
    logApiErrorEvent(event: ApiErrorEvent): void;
    logInvalidChunkEvent(event: InvalidChunkEvent): void;
    logContentRetryFailureEvent(event: ContentRetryFailureEvent): void;
    logMalformedJsonResponseEvent(event: MalformedJsonResponseEvent): void;
    logLoopDetectedEvent(event: LoopDetectedEvent): void;
    logKittySequenceOverflowEvent(event: KittySequenceOverflowEvent): void;
    logIdeConnectionEvent(event: IdeConnectionEvent): void;
    logExtensionInstallEvent(event: ExtensionInstallEvent): void;
    logExtensionUninstallEvent(event: ExtensionUninstallEvent): void;
    logExtensionUpdateEvent(event: ExtensionUpdateEvent): void;
    logExtensionEnableEvent(event: ExtensionEnableEvent): void;
    logExtensionDisableEvent(event: ExtensionDisableEvent): void;
    logAuthEvent(event: AuthEvent): void;
    logFlashFallbackEvent(event: FlashFallbackEvent): void;
    logRipgrepFallbackEvent(event: RipgrepFallbackEvent): void;
    logLoopDetectionDisabledEvent(): void;
    logNextSpeakerCheck(event: NextSpeakerCheckEvent): void;
    logSkillLaunchEvent(event: SkillLaunchEvent): void;
    logUserFeedbackEvent(event: UserFeedbackEvent): void;
    logChatCompressionEvent(event: ChatCompressionEvent): void;
    logContentRetryEvent(event: ContentRetryEvent): void;
    logArenaSessionStartedEvent(event: ArenaSessionStartedEvent): void;
    logArenaAgentCompletedEvent(event: ArenaAgentCompletedEvent): void;
    logArenaSessionEndedEvent(event: ArenaSessionEndedEvent): void;
    /**
     * Log a hook call event
     * Records hook execution telemetry for observability
     */
    logHookCallEvent(event: HookCallEvent): void;
    getProxyAgent(): HttpsProxyAgent<string> | undefined;
    private requeueFailedEvents;
}
export declare const TEST_ONLY: {
    MAX_RETRY_EVENTS: number;
    MAX_EVENTS: number;
    FLUSH_INTERVAL_MS: number;
};
