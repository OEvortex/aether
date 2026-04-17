/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export enum TelemetryTarget {
    GCP = 'gcp',
    LOCAL = 'local',
    AETHER = 'aether'
}

const DEFAULT_TELEMETRY_TARGET = TelemetryTarget.LOCAL;
const DEFAULT_OTLP_ENDPOINT = 'http://localhost:4317';

export { DEFAULT_TELEMETRY_TARGET, DEFAULT_OTLP_ENDPOINT };
export { SpanStatusCode, ValueType } from '@opentelemetry/api';
export { SemanticAttributes } from '@opentelemetry/semantic-conventions';
export { AetherLogger } from './aether-logger/aether-logger.js';
export {
    parseBooleanEnvFlag,
    parseTelemetryTargetValue,
    resolveTelemetrySettings
} from './config.js';
export {
    logApiCancel,
    logApiError,
    logApiRequest,
    logApiResponse,
    logArenaAgentCompleted,
    logArenaSessionEnded,
    logArenaSessionStarted,
    logAuth,
    logChatCompression,
    logConversationFinishedEvent,
    logExtensionDisable,
    logExtensionEnable,
    logExtensionInstallEvent,
    logExtensionUninstall,
    logExtensionUpdateEvent,
    logFlashFallback,
    logKittySequenceOverflow,
    logNextSpeakerCheck,
    logRipgrepFallback,
    logSkillLaunch,
    logSlashCommand,
    logStartSession,
    logToolCall,
    logToolOutputTruncated,
    logUserFeedback,
    logUserPrompt,
    logUserRetry
} from './loggers.js';
export {
    ApiRequestPhase,
    FileOperation,
    isPerformanceMonitoringActive,
    MemoryMetricType,
    // Performance monitoring types
    PerformanceMetricType,
    recordApiErrorMetrics,
    recordApiRequestBreakdown,
    recordApiResponseMetrics,
    recordArenaAgentCompletedMetrics,
    recordArenaSessionEndedMetrics,
    // Arena metrics functions
    recordArenaSessionStartedMetrics,
    recordBaselineComparison,
    recordContentRetry,
    recordContentRetryFailure,
    recordCpuUsage,
    recordFileOperationMetric,
    recordInvalidChunk,
    recordMemoryUsage,
    recordPerformanceRegression,
    recordPerformanceScore,
    // Performance monitoring functions
    recordStartupPerformance,
    recordTokenEfficiency,
    recordTokenUsageMetrics,
    // Core metrics functions
    recordToolCallMetrics,
    recordToolExecutionBreakdown,
    recordToolQueueDepth,
    ToolExecutionPhase
} from './metrics.js';
export { sanitizeHookName } from './sanitize.js';
export {
    initializeTelemetry,
    isTelemetrySdkInitialized,
    shutdownTelemetry
} from './sdk.js';
export type {
    ArenaAgentCompletedEvent,
    ArenaAgentCompletedStatus,
    ArenaSessionEndedEvent,
    ArenaSessionEndedStatus,
    ArenaSessionStartedEvent,
    ChatCompressionEvent,
    SlashCommandEvent,
    TelemetryEvent
} from './types.js';
export {
    ApiCancelEvent,
    ApiErrorEvent,
    ApiRequestEvent,
    ApiResponseEvent,
    AuthEvent,
    ConversationFinishedEvent,
    EndSessionEvent,
    FlashFallbackEvent,
    KittySequenceOverflowEvent,
    makeArenaAgentCompletedEvent,
    makeArenaSessionEndedEvent,
    makeArenaSessionStartedEvent,
    makeChatCompressionEvent,
    makeSlashCommandEvent,
    NextSpeakerCheckEvent,
    RipgrepFallbackEvent,
    SkillLaunchEvent,
    SlashCommandStatus,
    StartSessionEvent,
    ToolCallEvent,
    ToolOutputTruncatedEvent,
    UserFeedbackEvent,
    UserFeedbackRating,
    UserPromptEvent,
    UserRetryEvent
} from './types.js';
export * from './uiTelemetry.js';
