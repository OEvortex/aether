/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Attributes, Counter, Histogram, Meter } from '@opentelemetry/api';
import { ValueType } from '@opentelemetry/api';
import type { Config } from '../config/config.js';
import { EVENT_CHAT_COMPRESSION } from './constants.js';
import type { ModelSlashCommandEvent } from './types.js';
declare const TOOL_CALL_COUNT = "aether-cli.tool.call.count";
declare const API_REQUEST_COUNT = "aether-cli.api.request.count";
declare const TOKEN_USAGE = "aether-cli.token.usage";
declare const FILE_OPERATION_COUNT = "aether-cli.file.operation.count";
export declare const SUBAGENT_EXECUTION_COUNT = "aether-cli.subagent.execution.count";
declare const STARTUP_TIME = "aether-cli.startup.duration";
declare const MEMORY_USAGE = "aether-cli.memory.usage";
declare const CPU_USAGE = "aether-cli.cpu.usage";
declare const TOOL_EXECUTION_BREAKDOWN = "aether-cli.tool.execution.breakdown";
declare const TOKEN_EFFICIENCY = "aether-cli.token.efficiency";
declare const API_REQUEST_BREAKDOWN = "aether-cli.api.request.breakdown";
declare const PERFORMANCE_SCORE = "aether-cli.performance.score";
declare const REGRESSION_DETECTION = "aether-cli.performance.regression";
declare const BASELINE_COMPARISON = "aether-cli.performance.baseline.comparison";
declare const COUNTER_DEFINITIONS: {
    readonly "aether-cli.tool.call.count": {
        readonly description: "Counts tool calls, tagged by function name and success.";
        readonly valueType: ValueType.INT;
        readonly assign: (c: Counter) => Counter<Attributes>;
        readonly attributes: {
            function_name: string;
            success: boolean;
            decision?: "accept" | "reject" | "modify" | "auto_accept";
            tool_type?: "native" | "mcp";
        };
    };
    readonly "aether-cli.api.request.count": {
        readonly description: "Counts API requests, tagged by model and status.";
        readonly valueType: ValueType.INT;
        readonly assign: (c: Counter) => Counter<Attributes>;
        readonly attributes: {
            model: string;
            status_code?: number | string;
            error_type?: string;
        };
    };
    readonly "aether-cli.token.usage": {
        readonly description: "Counts the total number of tokens used.";
        readonly valueType: ValueType.INT;
        readonly assign: (c: Counter) => Counter<Attributes>;
        readonly attributes: {
            model: string;
            type: "input" | "output" | "thought" | "cache" | "tool";
        };
    };
    readonly "aether-cli.session.count": {
        readonly description: "Count of CLI sessions started.";
        readonly valueType: ValueType.INT;
        readonly assign: (c: Counter) => Counter<Attributes>;
        readonly attributes: Record<string, never>;
    };
    readonly "aether-cli.file.operation.count": {
        readonly description: "Counts file operations (create, read, update).";
        readonly valueType: ValueType.INT;
        readonly assign: (c: Counter) => Counter<Attributes>;
        readonly attributes: {
            operation: FileOperation;
            lines?: number;
            mimetype?: string;
            extension?: string;
            programming_language?: string;
        };
    };
    readonly "aether-cli.chat.invalid_chunk.count": {
        readonly description: "Counts invalid chunks received from a stream.";
        readonly valueType: ValueType.INT;
        readonly assign: (c: Counter) => Counter<Attributes>;
        readonly attributes: Record<string, never>;
    };
    readonly "aether-cli.chat.content_retry.count": {
        readonly description: "Counts retries due to content errors (e.g., empty stream).";
        readonly valueType: ValueType.INT;
        readonly assign: (c: Counter) => Counter<Attributes>;
        readonly attributes: Record<string, never>;
    };
    readonly "aether-cli.chat.content_retry_failure.count": {
        readonly description: "Counts occurrences of all content retries failing.";
        readonly valueType: ValueType.INT;
        readonly assign: (c: Counter) => Counter<Attributes>;
        readonly attributes: Record<string, never>;
    };
    readonly "aether-cli.slash_command.model.call_count": {
        readonly description: "Counts model slash command calls.";
        readonly valueType: ValueType.INT;
        readonly assign: (c: Counter) => Counter<Attributes>;
        readonly attributes: {
            "slash_command.model.model_name": string;
        };
    };
    readonly "aether-cli.chat_compression": {
        readonly description: "Counts chat compression events.";
        readonly valueType: ValueType.INT;
        readonly assign: (c: Counter) => Counter<Attributes>;
        readonly attributes: {
            tokens_before: number;
            tokens_after: number;
        };
    };
};
declare const HISTOGRAM_DEFINITIONS: {
    readonly "aether-cli.tool.call.latency": {
        readonly description: "Latency of tool calls in milliseconds.";
        readonly unit: "ms";
        readonly valueType: ValueType.INT;
        readonly assign: (h: Histogram) => Histogram<Attributes>;
        readonly attributes: {
            function_name: string;
        };
    };
    readonly "aether-cli.api.request.latency": {
        readonly description: "Latency of API requests in milliseconds.";
        readonly unit: "ms";
        readonly valueType: ValueType.INT;
        readonly assign: (h: Histogram) => Histogram<Attributes>;
        readonly attributes: {
            model: string;
        };
    };
};
declare const PERFORMANCE_COUNTER_DEFINITIONS: {
    readonly "aether-cli.performance.regression": {
        readonly description: "Performance regression detection events.";
        readonly valueType: ValueType.INT;
        readonly assign: (c: Counter) => Counter<Attributes>;
        readonly attributes: {
            metric: string;
            severity: "low" | "medium" | "high";
            current_value: number;
            baseline_value: number;
        };
    };
};
declare const PERFORMANCE_HISTOGRAM_DEFINITIONS: {
    readonly "aether-cli.startup.duration": {
        readonly description: "CLI startup time in milliseconds, broken down by initialization phase.";
        readonly unit: "ms";
        readonly valueType: ValueType.DOUBLE;
        readonly assign: (h: Histogram) => Histogram<Attributes>;
        readonly attributes: {
            phase: string;
            details?: Record<string, string | number | boolean>;
        };
    };
    readonly "aether-cli.memory.usage": {
        readonly description: "Memory usage in bytes.";
        readonly unit: "bytes";
        readonly valueType: ValueType.INT;
        readonly assign: (h: Histogram) => Histogram<Attributes>;
        readonly attributes: {
            memory_type: MemoryMetricType;
            component?: string;
        };
    };
    readonly "aether-cli.cpu.usage": {
        readonly description: "CPU usage percentage.";
        readonly unit: "percent";
        readonly valueType: ValueType.DOUBLE;
        readonly assign: (h: Histogram) => Histogram<Attributes>;
        readonly attributes: {
            component?: string;
        };
    };
    readonly "aether-cli.tool.queue.depth": {
        readonly description: "Number of tools in execution queue.";
        readonly unit: "count";
        readonly valueType: ValueType.INT;
        readonly assign: (h: Histogram) => Histogram<Attributes>;
        readonly attributes: Record<string, never>;
    };
    readonly "aether-cli.tool.execution.breakdown": {
        readonly description: "Tool execution time breakdown by phase in milliseconds.";
        readonly unit: "ms";
        readonly valueType: ValueType.INT;
        readonly assign: (h: Histogram) => Histogram<Attributes>;
        readonly attributes: {
            function_name: string;
            phase: ToolExecutionPhase;
        };
    };
    readonly "aether-cli.token.efficiency": {
        readonly description: "Token efficiency metrics (tokens per operation, cache hit rate, etc.).";
        readonly unit: "ratio";
        readonly valueType: ValueType.DOUBLE;
        readonly assign: (h: Histogram) => Histogram<Attributes>;
        readonly attributes: {
            model: string;
            metric: string;
            context?: string;
        };
    };
    readonly "aether-cli.api.request.breakdown": {
        readonly description: "API request time breakdown by phase in milliseconds.";
        readonly unit: "ms";
        readonly valueType: ValueType.INT;
        readonly assign: (h: Histogram) => Histogram<Attributes>;
        readonly attributes: {
            model: string;
            phase: ApiRequestPhase;
        };
    };
    readonly "aether-cli.performance.score": {
        readonly description: "Composite performance score (0-100).";
        readonly unit: "score";
        readonly valueType: ValueType.DOUBLE;
        readonly assign: (h: Histogram) => Histogram<Attributes>;
        readonly attributes: {
            category: string;
            baseline?: number;
        };
    };
    readonly "aether-cli.performance.regression.percentage_change": {
        readonly description: "Percentage change compared to baseline for detected regressions.";
        readonly unit: "percent";
        readonly valueType: ValueType.DOUBLE;
        readonly assign: (h: Histogram) => Histogram<Attributes>;
        readonly attributes: {
            metric: string;
            severity: "low" | "medium" | "high";
            current_value: number;
            baseline_value: number;
        };
    };
    readonly "aether-cli.performance.baseline.comparison": {
        readonly description: "Performance comparison to established baseline (percentage change).";
        readonly unit: "percent";
        readonly valueType: ValueType.DOUBLE;
        readonly assign: (h: Histogram) => Histogram<Attributes>;
        readonly attributes: {
            metric: string;
            category: string;
            current_value: number;
            baseline_value: number;
        };
    };
};
type AllMetricDefs = typeof COUNTER_DEFINITIONS & typeof HISTOGRAM_DEFINITIONS & typeof PERFORMANCE_COUNTER_DEFINITIONS & typeof PERFORMANCE_HISTOGRAM_DEFINITIONS;
export type MetricDefinitions = {
    [K in keyof AllMetricDefs]: {
        attributes: AllMetricDefs[K]['attributes'];
    };
};
export declare enum FileOperation {
    CREATE = "create",
    READ = "read",
    UPDATE = "update"
}
export declare enum PerformanceMetricType {
    STARTUP = "startup",
    MEMORY = "memory",
    CPU = "cpu",
    TOOL_EXECUTION = "tool_execution",
    API_REQUEST = "api_request",
    TOKEN_EFFICIENCY = "token_efficiency"
}
export declare enum MemoryMetricType {
    HEAP_USED = "heap_used",
    HEAP_TOTAL = "heap_total",
    EXTERNAL = "external",
    RSS = "rss"
}
export declare enum ToolExecutionPhase {
    VALIDATION = "validation",
    PREPARATION = "preparation",
    EXECUTION = "execution",
    RESULT_PROCESSING = "result_processing"
}
export declare enum ApiRequestPhase {
    REQUEST_PREPARATION = "request_preparation",
    NETWORK_LATENCY = "network_latency",
    RESPONSE_PROCESSING = "response_processing",
    TOKEN_PROCESSING = "token_processing"
}
export declare function getMeter(): Meter | undefined;
export declare function initializeMetrics(config: Config): void;
export declare function recordChatCompressionMetrics(config: Config, attributes: MetricDefinitions[typeof EVENT_CHAT_COMPRESSION]['attributes']): void;
export declare function recordToolCallMetrics(config: Config, durationMs: number, attributes: MetricDefinitions[typeof TOOL_CALL_COUNT]['attributes']): void;
export declare function recordTokenUsageMetrics(config: Config, tokenCount: number, attributes: MetricDefinitions[typeof TOKEN_USAGE]['attributes']): void;
export declare function recordApiResponseMetrics(config: Config, durationMs: number, attributes: MetricDefinitions[typeof API_REQUEST_COUNT]['attributes']): void;
export declare function recordApiErrorMetrics(config: Config, durationMs: number, attributes: MetricDefinitions[typeof API_REQUEST_COUNT]['attributes']): void;
export declare function recordFileOperationMetric(config: Config, attributes: MetricDefinitions[typeof FILE_OPERATION_COUNT]['attributes']): void;
/**
 * Records a metric for when an invalid chunk is received from a stream.
 */
export declare function recordInvalidChunk(config: Config): void;
/**
 * Records a metric for when a retry is triggered due to a content error.
 */
export declare function recordContentRetry(config: Config): void;
/**
 * Records a metric for when all content error retries have failed for a request.
 */
export declare function recordContentRetryFailure(config: Config): void;
export declare function recordModelSlashCommand(config: Config, event: ModelSlashCommandEvent): void;
export declare function initializePerformanceMonitoring(config: Config): void;
export declare function recordStartupPerformance(config: Config, durationMs: number, attributes: MetricDefinitions[typeof STARTUP_TIME]['attributes']): void;
export declare function recordMemoryUsage(config: Config, bytes: number, attributes: MetricDefinitions[typeof MEMORY_USAGE]['attributes']): void;
export declare function recordCpuUsage(config: Config, percentage: number, attributes: MetricDefinitions[typeof CPU_USAGE]['attributes']): void;
export declare function recordToolQueueDepth(config: Config, queueDepth: number): void;
export declare function recordToolExecutionBreakdown(config: Config, durationMs: number, attributes: MetricDefinitions[typeof TOOL_EXECUTION_BREAKDOWN]['attributes']): void;
export declare function recordTokenEfficiency(config: Config, value: number, attributes: MetricDefinitions[typeof TOKEN_EFFICIENCY]['attributes']): void;
export declare function recordApiRequestBreakdown(config: Config, durationMs: number, attributes: MetricDefinitions[typeof API_REQUEST_BREAKDOWN]['attributes']): void;
export declare function recordPerformanceScore(config: Config, score: number, attributes: MetricDefinitions[typeof PERFORMANCE_SCORE]['attributes']): void;
export declare function recordPerformanceRegression(config: Config, attributes: MetricDefinitions[typeof REGRESSION_DETECTION]['attributes']): void;
export declare function recordBaselineComparison(config: Config, attributes: MetricDefinitions[typeof BASELINE_COMPARISON]['attributes']): void;
export declare function isPerformanceMonitoringActive(): boolean;
/**
 * Records a metric for subagent execution events.
 */
export declare function recordSubagentExecutionMetrics(config: Config, subagentName: string, status: 'started' | 'completed' | 'failed' | 'cancelled', terminateReason?: string): void;
export declare function recordArenaSessionStartedMetrics(config: Config): void;
export declare function recordArenaAgentCompletedMetrics(config: Config, modelId: string, status: string, durationMs: number, inputTokens: number, outputTokens: number): void;
export declare function recordArenaSessionEndedMetrics(config: Config, status: string, displayBackend?: string, durationMs?: number, winnerModelId?: string): void;
export {};
