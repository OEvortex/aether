/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { LogAttributes } from '@opentelemetry/api-logs';
import type { Config } from '../config/config.js';
import type { ApiCancelEvent, ApiErrorEvent, ApiRequestEvent, ApiResponseEvent, ArenaAgentCompletedEvent, ArenaSessionEndedEvent, ArenaSessionStartedEvent, AuthEvent, ChatCompressionEvent, ContentRetryEvent, ContentRetryFailureEvent, ConversationFinishedEvent, ExtensionDisableEvent, ExtensionEnableEvent, ExtensionInstallEvent, ExtensionUninstallEvent, ExtensionUpdateEvent, FileOperationEvent, FlashFallbackEvent, HookCallEvent, IdeConnectionEvent, InvalidChunkEvent, KittySequenceOverflowEvent, LoopDetectedEvent, LoopDetectionDisabledEvent, MalformedJsonResponseEvent, ModelSlashCommandEvent, NextSpeakerCheckEvent, PromptSuggestionEvent, RipgrepFallbackEvent, SkillLaunchEvent, SlashCommandEvent, SpeculationEvent, StartSessionEvent, SubagentExecutionEvent, ToolCallEvent, ToolOutputTruncatedEvent, UserFeedbackEvent, UserPromptEvent, UserRetryEvent } from './types.js';
declare function getCommonAttributes(config: Config): LogAttributes;
export { getCommonAttributes };
export declare function logStartSession(config: Config, event: StartSessionEvent): void;
export declare function logUserPrompt(config: Config, event: UserPromptEvent): void;
export declare function logUserRetry(config: Config, event: UserRetryEvent): void;
export declare function logToolCall(config: Config, event: ToolCallEvent): void;
export declare function logToolOutputTruncated(config: Config, event: ToolOutputTruncatedEvent): void;
export declare function logFileOperation(config: Config, event: FileOperationEvent): void;
export declare function logApiRequest(config: Config, event: ApiRequestEvent): void;
export declare function logFlashFallback(config: Config, event: FlashFallbackEvent): void;
export declare function logRipgrepFallback(config: Config, event: RipgrepFallbackEvent): void;
export declare function logApiError(config: Config, event: ApiErrorEvent): void;
export declare function logApiCancel(config: Config, event: ApiCancelEvent): void;
export declare function logApiResponse(config: Config, event: ApiResponseEvent): void;
export declare function logLoopDetected(config: Config, event: LoopDetectedEvent): void;
export declare function logLoopDetectionDisabled(config: Config, _event: LoopDetectionDisabledEvent): void;
export declare function logNextSpeakerCheck(config: Config, event: NextSpeakerCheckEvent): void;
export declare function logSlashCommand(config: Config, event: SlashCommandEvent): void;
export declare function logIdeConnection(config: Config, event: IdeConnectionEvent): void;
export declare function logConversationFinishedEvent(config: Config, event: ConversationFinishedEvent): void;
export declare function logChatCompression(config: Config, event: ChatCompressionEvent): void;
export declare function logKittySequenceOverflow(config: Config, event: KittySequenceOverflowEvent): void;
export declare function logMalformedJsonResponse(config: Config, event: MalformedJsonResponseEvent): void;
export declare function logInvalidChunk(config: Config, event: InvalidChunkEvent): void;
export declare function logContentRetry(config: Config, event: ContentRetryEvent): void;
export declare function logContentRetryFailure(config: Config, event: ContentRetryFailureEvent): void;
export declare function logSubagentExecution(config: Config, event: SubagentExecutionEvent): void;
export declare function logModelSlashCommand(config: Config, event: ModelSlashCommandEvent): void;
export declare function logHookCall(config: Config, event: HookCallEvent): void;
export declare function logExtensionInstallEvent(config: Config, event: ExtensionInstallEvent): void;
export declare function logExtensionUninstall(config: Config, event: ExtensionUninstallEvent): void;
export declare function logExtensionUpdateEvent(config: Config, event: ExtensionUpdateEvent): Promise<void>;
export declare function logExtensionEnable(config: Config, event: ExtensionEnableEvent): void;
export declare function logExtensionDisable(config: Config, event: ExtensionDisableEvent): void;
export declare function logAuth(config: Config, event: AuthEvent): void;
export declare function logSkillLaunch(config: Config, event: SkillLaunchEvent): void;
export declare function logUserFeedback(config: Config, event: UserFeedbackEvent): void;
export declare function logArenaSessionStarted(config: Config, event: ArenaSessionStartedEvent): void;
export declare function logArenaAgentCompleted(config: Config, event: ArenaAgentCompletedEvent): void;
export declare function logArenaSessionEnded(config: Config, event: ArenaSessionEndedEvent): void;
export declare function logPromptSuggestion(config: Config, event: PromptSuggestionEvent): void;
export declare function logSpeculation(config: Config, event: SpeculationEvent): void;
