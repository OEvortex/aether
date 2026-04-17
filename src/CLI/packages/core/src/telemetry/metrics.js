/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { diag, metrics, ValueType } from '@opentelemetry/api';
import { EVENT_CHAT_COMPRESSION, SERVICE_NAME } from './constants.js';
const TOOL_CALL_COUNT = `${SERVICE_NAME}.tool.call.count`;
const TOOL_CALL_LATENCY = `${SERVICE_NAME}.tool.call.latency`;
const API_REQUEST_COUNT = `${SERVICE_NAME}.api.request.count`;
const API_REQUEST_LATENCY = `${SERVICE_NAME}.api.request.latency`;
const TOKEN_USAGE = `${SERVICE_NAME}.token.usage`;
const SESSION_COUNT = `${SERVICE_NAME}.session.count`;
const FILE_OPERATION_COUNT = `${SERVICE_NAME}.file.operation.count`;
const INVALID_CHUNK_COUNT = `${SERVICE_NAME}.chat.invalid_chunk.count`;
const CONTENT_RETRY_COUNT = `${SERVICE_NAME}.chat.content_retry.count`;
const CONTENT_RETRY_FAILURE_COUNT = `${SERVICE_NAME}.chat.content_retry_failure.count`;
const MODEL_SLASH_COMMAND_CALL_COUNT = `${SERVICE_NAME}.slash_command.model.call_count`;
export const SUBAGENT_EXECUTION_COUNT = `${SERVICE_NAME}.subagent.execution.count`;
// Arena Metrics
const ARENA_SESSION_COUNT = `${SERVICE_NAME}.arena.session.count`;
const ARENA_SESSION_DURATION = `${SERVICE_NAME}.arena.session.duration`;
const ARENA_AGENT_COUNT = `${SERVICE_NAME}.arena.agent.count`;
const ARENA_AGENT_DURATION = `${SERVICE_NAME}.arena.agent.duration`;
const ARENA_AGENT_TOKENS = `${SERVICE_NAME}.arena.agent.tokens`;
const ARENA_RESULT_SELECTED = `${SERVICE_NAME}.arena.result.selected`;
// Performance Monitoring Metrics
const STARTUP_TIME = `${SERVICE_NAME}.startup.duration`;
const MEMORY_USAGE = `${SERVICE_NAME}.memory.usage`;
const CPU_USAGE = `${SERVICE_NAME}.cpu.usage`;
const TOOL_QUEUE_DEPTH = `${SERVICE_NAME}.tool.queue.depth`;
const TOOL_EXECUTION_BREAKDOWN = `${SERVICE_NAME}.tool.execution.breakdown`;
const TOKEN_EFFICIENCY = `${SERVICE_NAME}.token.efficiency`;
const API_REQUEST_BREAKDOWN = `${SERVICE_NAME}.api.request.breakdown`;
const PERFORMANCE_SCORE = `${SERVICE_NAME}.performance.score`;
const REGRESSION_DETECTION = `${SERVICE_NAME}.performance.regression`;
const REGRESSION_PERCENTAGE_CHANGE = `${SERVICE_NAME}.performance.regression.percentage_change`;
const BASELINE_COMPARISON = `${SERVICE_NAME}.performance.baseline.comparison`;
const baseMetricDefinition = {
    getCommonAttributes: (config) => ({
        'session.id': config.getSessionId()
    })
};
const COUNTER_DEFINITIONS = {
    [TOOL_CALL_COUNT]: {
        description: 'Counts tool calls, tagged by function name and success.',
        valueType: ValueType.INT,
        assign: (c) => (toolCallCounter = c),
        attributes: {}
    },
    [API_REQUEST_COUNT]: {
        description: 'Counts API requests, tagged by model and status.',
        valueType: ValueType.INT,
        assign: (c) => (apiRequestCounter = c),
        attributes: {}
    },
    [TOKEN_USAGE]: {
        description: 'Counts the total number of tokens used.',
        valueType: ValueType.INT,
        assign: (c) => (tokenUsageCounter = c),
        attributes: {}
    },
    [SESSION_COUNT]: {
        description: 'Count of CLI sessions started.',
        valueType: ValueType.INT,
        assign: (c) => (sessionCounter = c),
        attributes: {}
    },
    [FILE_OPERATION_COUNT]: {
        description: 'Counts file operations (create, read, update).',
        valueType: ValueType.INT,
        assign: (c) => (fileOperationCounter = c),
        attributes: {}
    },
    [INVALID_CHUNK_COUNT]: {
        description: 'Counts invalid chunks received from a stream.',
        valueType: ValueType.INT,
        assign: (c) => (invalidChunkCounter = c),
        attributes: {}
    },
    [CONTENT_RETRY_COUNT]: {
        description: 'Counts retries due to content errors (e.g., empty stream).',
        valueType: ValueType.INT,
        assign: (c) => (contentRetryCounter = c),
        attributes: {}
    },
    [CONTENT_RETRY_FAILURE_COUNT]: {
        description: 'Counts occurrences of all content retries failing.',
        valueType: ValueType.INT,
        assign: (c) => (contentRetryFailureCounter = c),
        attributes: {}
    },
    [MODEL_SLASH_COMMAND_CALL_COUNT]: {
        description: 'Counts model slash command calls.',
        valueType: ValueType.INT,
        assign: (c) => (modelSlashCommandCallCounter = c),
        attributes: {}
    },
    [EVENT_CHAT_COMPRESSION]: {
        description: 'Counts chat compression events.',
        valueType: ValueType.INT,
        assign: (c) => (chatCompressionCounter = c),
        attributes: {}
    }
};
const HISTOGRAM_DEFINITIONS = {
    [TOOL_CALL_LATENCY]: {
        description: 'Latency of tool calls in milliseconds.',
        unit: 'ms',
        valueType: ValueType.INT,
        assign: (h) => (toolCallLatencyHistogram = h),
        attributes: {}
    },
    [API_REQUEST_LATENCY]: {
        description: 'Latency of API requests in milliseconds.',
        unit: 'ms',
        valueType: ValueType.INT,
        assign: (h) => (apiRequestLatencyHistogram = h),
        attributes: {}
    }
};
const PERFORMANCE_COUNTER_DEFINITIONS = {
    [REGRESSION_DETECTION]: {
        description: 'Performance regression detection events.',
        valueType: ValueType.INT,
        assign: (c) => (regressionDetectionCounter = c),
        attributes: {}
    }
};
const PERFORMANCE_HISTOGRAM_DEFINITIONS = {
    [STARTUP_TIME]: {
        description: 'CLI startup time in milliseconds, broken down by initialization phase.',
        unit: 'ms',
        valueType: ValueType.DOUBLE,
        assign: (h) => (startupTimeHistogram = h),
        attributes: {}
    },
    [MEMORY_USAGE]: {
        description: 'Memory usage in bytes.',
        unit: 'bytes',
        valueType: ValueType.INT,
        assign: (h) => (memoryUsageGauge = h),
        attributes: {}
    },
    [CPU_USAGE]: {
        description: 'CPU usage percentage.',
        unit: 'percent',
        valueType: ValueType.DOUBLE,
        assign: (h) => (cpuUsageGauge = h),
        attributes: {}
    },
    [TOOL_QUEUE_DEPTH]: {
        description: 'Number of tools in execution queue.',
        unit: 'count',
        valueType: ValueType.INT,
        assign: (h) => (toolQueueDepthGauge = h),
        attributes: {}
    },
    [TOOL_EXECUTION_BREAKDOWN]: {
        description: 'Tool execution time breakdown by phase in milliseconds.',
        unit: 'ms',
        valueType: ValueType.INT,
        assign: (h) => (toolExecutionBreakdownHistogram = h),
        attributes: {}
    },
    [TOKEN_EFFICIENCY]: {
        description: 'Token efficiency metrics (tokens per operation, cache hit rate, etc.).',
        unit: 'ratio',
        valueType: ValueType.DOUBLE,
        assign: (h) => (tokenEfficiencyHistogram = h),
        attributes: {}
    },
    [API_REQUEST_BREAKDOWN]: {
        description: 'API request time breakdown by phase in milliseconds.',
        unit: 'ms',
        valueType: ValueType.INT,
        assign: (h) => (apiRequestBreakdownHistogram = h),
        attributes: {}
    },
    [PERFORMANCE_SCORE]: {
        description: 'Composite performance score (0-100).',
        unit: 'score',
        valueType: ValueType.DOUBLE,
        assign: (h) => (performanceScoreGauge = h),
        attributes: {}
    },
    [REGRESSION_PERCENTAGE_CHANGE]: {
        description: 'Percentage change compared to baseline for detected regressions.',
        unit: 'percent',
        valueType: ValueType.DOUBLE,
        assign: (h) => (regressionPercentageChangeHistogram = h),
        attributes: {}
    },
    [BASELINE_COMPARISON]: {
        description: 'Performance comparison to established baseline (percentage change).',
        unit: 'percent',
        valueType: ValueType.DOUBLE,
        assign: (h) => (baselineComparisonHistogram = h),
        attributes: {}
    }
};
export var FileOperation;
(function (FileOperation) {
    FileOperation["CREATE"] = "create";
    FileOperation["READ"] = "read";
    FileOperation["UPDATE"] = "update";
})(FileOperation || (FileOperation = {}));
export var PerformanceMetricType;
(function (PerformanceMetricType) {
    PerformanceMetricType["STARTUP"] = "startup";
    PerformanceMetricType["MEMORY"] = "memory";
    PerformanceMetricType["CPU"] = "cpu";
    PerformanceMetricType["TOOL_EXECUTION"] = "tool_execution";
    PerformanceMetricType["API_REQUEST"] = "api_request";
    PerformanceMetricType["TOKEN_EFFICIENCY"] = "token_efficiency";
})(PerformanceMetricType || (PerformanceMetricType = {}));
export var MemoryMetricType;
(function (MemoryMetricType) {
    MemoryMetricType["HEAP_USED"] = "heap_used";
    MemoryMetricType["HEAP_TOTAL"] = "heap_total";
    MemoryMetricType["EXTERNAL"] = "external";
    MemoryMetricType["RSS"] = "rss";
})(MemoryMetricType || (MemoryMetricType = {}));
export var ToolExecutionPhase;
(function (ToolExecutionPhase) {
    ToolExecutionPhase["VALIDATION"] = "validation";
    ToolExecutionPhase["PREPARATION"] = "preparation";
    ToolExecutionPhase["EXECUTION"] = "execution";
    ToolExecutionPhase["RESULT_PROCESSING"] = "result_processing";
})(ToolExecutionPhase || (ToolExecutionPhase = {}));
export var ApiRequestPhase;
(function (ApiRequestPhase) {
    ApiRequestPhase["REQUEST_PREPARATION"] = "request_preparation";
    ApiRequestPhase["NETWORK_LATENCY"] = "network_latency";
    ApiRequestPhase["RESPONSE_PROCESSING"] = "response_processing";
    ApiRequestPhase["TOKEN_PROCESSING"] = "token_processing";
})(ApiRequestPhase || (ApiRequestPhase = {}));
let cliMeter;
let toolCallCounter;
let toolCallLatencyHistogram;
let apiRequestCounter;
let apiRequestLatencyHistogram;
let tokenUsageCounter;
let sessionCounter;
let fileOperationCounter;
let chatCompressionCounter;
let invalidChunkCounter;
let contentRetryCounter;
let contentRetryFailureCounter;
let subagentExecutionCounter;
let modelSlashCommandCallCounter;
// Performance Monitoring Metrics
let startupTimeHistogram;
let memoryUsageGauge; // Using Histogram until ObservableGauge is available
let cpuUsageGauge;
let toolQueueDepthGauge;
let toolExecutionBreakdownHistogram;
let tokenEfficiencyHistogram;
let apiRequestBreakdownHistogram;
let performanceScoreGauge;
let regressionDetectionCounter;
let regressionPercentageChangeHistogram;
let baselineComparisonHistogram;
// Arena Metrics
let arenaSessionCounter;
let arenaSessionDurationHistogram;
let arenaAgentCounter;
let arenaAgentDurationHistogram;
let arenaAgentTokensCounter;
let arenaResultSelectedCounter;
let isMetricsInitialized = false;
let isPerformanceMonitoringEnabled = false;
export function getMeter() {
    if (!cliMeter) {
        cliMeter = metrics.getMeter(SERVICE_NAME);
    }
    return cliMeter;
}
export function initializeMetrics(config) {
    if (isMetricsInitialized) {
        return;
    }
    const meter = getMeter();
    if (!meter) {
        return;
    }
    // Initialize core metrics
    Object.entries(COUNTER_DEFINITIONS).forEach(([name, { description, valueType, assign }]) => {
        assign(meter.createCounter(name, { description, valueType }));
    });
    subagentExecutionCounter = meter.createCounter(SUBAGENT_EXECUTION_COUNT, {
        description: 'Counts subagent execution events, tagged by status and subagent name.',
        valueType: ValueType.INT
    });
    // Arena metrics
    arenaSessionCounter = meter.createCounter(ARENA_SESSION_COUNT, {
        description: 'Counts arena sessions by status and display backend.',
        valueType: ValueType.INT
    });
    arenaSessionDurationHistogram = meter.createHistogram(ARENA_SESSION_DURATION, {
        description: 'Duration of arena sessions in milliseconds.',
        unit: 'ms',
        valueType: ValueType.INT
    });
    arenaAgentCounter = meter.createCounter(ARENA_AGENT_COUNT, {
        description: 'Counts arena agent completions by status and model.',
        valueType: ValueType.INT
    });
    arenaAgentDurationHistogram = meter.createHistogram(ARENA_AGENT_DURATION, {
        description: 'Duration of arena agent execution in milliseconds.',
        unit: 'ms',
        valueType: ValueType.INT
    });
    arenaAgentTokensCounter = meter.createCounter(ARENA_AGENT_TOKENS, {
        description: 'Token usage by arena agents.',
        valueType: ValueType.INT
    });
    arenaResultSelectedCounter = meter.createCounter(ARENA_RESULT_SELECTED, {
        description: 'Counts arena result selections by model.',
        valueType: ValueType.INT
    });
    Object.entries(HISTOGRAM_DEFINITIONS).forEach(([name, { description, unit, valueType, assign }]) => {
        assign(meter.createHistogram(name, { description, unit, valueType }));
    });
    // Increment session counter after all metrics are initialized
    sessionCounter?.add(1, baseMetricDefinition.getCommonAttributes(config));
    // Initialize performance monitoring metrics if enabled
    initializePerformanceMonitoring(config);
    isMetricsInitialized = true;
}
export function recordChatCompressionMetrics(config, attributes) {
    if (!chatCompressionCounter || !isMetricsInitialized) {
        return;
    }
    chatCompressionCounter.add(1, {
        ...baseMetricDefinition.getCommonAttributes(config),
        ...attributes
    });
}
export function recordToolCallMetrics(config, durationMs, attributes) {
    if (!toolCallCounter ||
        !toolCallLatencyHistogram ||
        !isMetricsInitialized) {
        return;
    }
    const metricAttributes = {
        ...baseMetricDefinition.getCommonAttributes(config),
        ...attributes
    };
    toolCallCounter.add(1, metricAttributes);
    toolCallLatencyHistogram.record(durationMs, {
        ...baseMetricDefinition.getCommonAttributes(config),
        function_name: attributes.function_name
    });
}
export function recordTokenUsageMetrics(config, tokenCount, attributes) {
    if (!tokenUsageCounter || !isMetricsInitialized) {
        return;
    }
    tokenUsageCounter.add(tokenCount, {
        ...baseMetricDefinition.getCommonAttributes(config),
        ...attributes
    });
}
export function recordApiResponseMetrics(config, durationMs, attributes) {
    if (!apiRequestCounter ||
        !apiRequestLatencyHistogram ||
        !isMetricsInitialized) {
        return;
    }
    const metricAttributes = {
        ...baseMetricDefinition.getCommonAttributes(config),
        model: attributes.model,
        status_code: attributes.status_code ?? 'ok'
    };
    apiRequestCounter.add(1, metricAttributes);
    apiRequestLatencyHistogram.record(durationMs, {
        ...baseMetricDefinition.getCommonAttributes(config),
        model: attributes.model
    });
}
export function recordApiErrorMetrics(config, durationMs, attributes) {
    if (!apiRequestCounter ||
        !apiRequestLatencyHistogram ||
        !isMetricsInitialized) {
        return;
    }
    const metricAttributes = {
        ...baseMetricDefinition.getCommonAttributes(config),
        model: attributes.model,
        status_code: attributes.status_code ?? 'error',
        error_type: attributes.error_type ?? 'unknown'
    };
    apiRequestCounter.add(1, metricAttributes);
    apiRequestLatencyHistogram.record(durationMs, {
        ...baseMetricDefinition.getCommonAttributes(config),
        model: attributes.model
    });
}
export function recordFileOperationMetric(config, attributes) {
    if (!fileOperationCounter || !isMetricsInitialized) {
        return;
    }
    fileOperationCounter.add(1, {
        ...baseMetricDefinition.getCommonAttributes(config),
        ...attributes
    });
}
// --- New Metric Recording Functions ---
/**
 * Records a metric for when an invalid chunk is received from a stream.
 */
export function recordInvalidChunk(config) {
    if (!invalidChunkCounter || !isMetricsInitialized) {
        return;
    }
    invalidChunkCounter.add(1, baseMetricDefinition.getCommonAttributes(config));
}
/**
 * Records a metric for when a retry is triggered due to a content error.
 */
export function recordContentRetry(config) {
    if (!contentRetryCounter || !isMetricsInitialized) {
        return;
    }
    contentRetryCounter.add(1, baseMetricDefinition.getCommonAttributes(config));
}
/**
 * Records a metric for when all content error retries have failed for a request.
 */
export function recordContentRetryFailure(config) {
    if (!contentRetryFailureCounter || !isMetricsInitialized) {
        return;
    }
    contentRetryFailureCounter.add(1, baseMetricDefinition.getCommonAttributes(config));
}
export function recordModelSlashCommand(config, event) {
    if (!modelSlashCommandCallCounter || !isMetricsInitialized) {
        return;
    }
    modelSlashCommandCallCounter.add(1, {
        ...baseMetricDefinition.getCommonAttributes(config),
        'slash_command.model.model_name': event.model_name
    });
}
// Performance Monitoring Functions
export function initializePerformanceMonitoring(config) {
    const meter = getMeter();
    if (!meter) {
        return;
    }
    // Check if performance monitoring is enabled in config
    // For now, enable performance monitoring when telemetry is enabled
    // TODO: Add specific performance monitoring settings to config
    isPerformanceMonitoringEnabled = config.getTelemetryEnabled();
    if (!isPerformanceMonitoringEnabled) {
        return;
    }
    Object.entries(PERFORMANCE_COUNTER_DEFINITIONS).forEach(([name, { description, valueType, assign }]) => {
        assign(meter.createCounter(name, { description, valueType }));
    });
    Object.entries(PERFORMANCE_HISTOGRAM_DEFINITIONS).forEach(([name, { description, unit, valueType, assign }]) => {
        assign(meter.createHistogram(name, { description, unit, valueType }));
    });
}
export function recordStartupPerformance(config, durationMs, attributes) {
    if (!startupTimeHistogram || !isPerformanceMonitoringEnabled) {
        return;
    }
    const metricAttributes = {
        ...baseMetricDefinition.getCommonAttributes(config),
        phase: attributes.phase,
        ...attributes.details
    };
    startupTimeHistogram.record(durationMs, metricAttributes);
}
export function recordMemoryUsage(config, bytes, attributes) {
    if (!memoryUsageGauge || !isPerformanceMonitoringEnabled) {
        return;
    }
    const metricAttributes = {
        ...baseMetricDefinition.getCommonAttributes(config),
        ...attributes
    };
    memoryUsageGauge.record(bytes, metricAttributes);
}
export function recordCpuUsage(config, percentage, attributes) {
    if (!cpuUsageGauge || !isPerformanceMonitoringEnabled) {
        return;
    }
    const metricAttributes = {
        ...baseMetricDefinition.getCommonAttributes(config),
        ...attributes
    };
    cpuUsageGauge.record(percentage, metricAttributes);
}
export function recordToolQueueDepth(config, queueDepth) {
    if (!toolQueueDepthGauge || !isPerformanceMonitoringEnabled) {
        return;
    }
    const attributes = {
        ...baseMetricDefinition.getCommonAttributes(config)
    };
    toolQueueDepthGauge.record(queueDepth, attributes);
}
export function recordToolExecutionBreakdown(config, durationMs, attributes) {
    if (!toolExecutionBreakdownHistogram || !isPerformanceMonitoringEnabled) {
        return;
    }
    const metricAttributes = {
        ...baseMetricDefinition.getCommonAttributes(config),
        ...attributes
    };
    toolExecutionBreakdownHistogram.record(durationMs, metricAttributes);
}
export function recordTokenEfficiency(config, value, attributes) {
    if (!tokenEfficiencyHistogram || !isPerformanceMonitoringEnabled) {
        return;
    }
    const metricAttributes = {
        ...baseMetricDefinition.getCommonAttributes(config),
        ...attributes
    };
    tokenEfficiencyHistogram.record(value, metricAttributes);
}
export function recordApiRequestBreakdown(config, durationMs, attributes) {
    if (!apiRequestBreakdownHistogram || !isPerformanceMonitoringEnabled) {
        return;
    }
    const metricAttributes = {
        ...baseMetricDefinition.getCommonAttributes(config),
        ...attributes
    };
    apiRequestBreakdownHistogram.record(durationMs, metricAttributes);
}
export function recordPerformanceScore(config, score, attributes) {
    if (!performanceScoreGauge || !isPerformanceMonitoringEnabled) {
        return;
    }
    const metricAttributes = {
        ...baseMetricDefinition.getCommonAttributes(config),
        ...attributes
    };
    performanceScoreGauge.record(score, metricAttributes);
}
export function recordPerformanceRegression(config, attributes) {
    if (!regressionDetectionCounter || !isPerformanceMonitoringEnabled) {
        return;
    }
    const metricAttributes = {
        ...baseMetricDefinition.getCommonAttributes(config),
        ...attributes
    };
    regressionDetectionCounter.add(1, metricAttributes);
    if (attributes.baseline_value !== 0 &&
        regressionPercentageChangeHistogram) {
        const percentageChange = ((attributes.current_value - attributes.baseline_value) /
            attributes.baseline_value) *
            100;
        regressionPercentageChangeHistogram.record(percentageChange, metricAttributes);
    }
}
export function recordBaselineComparison(config, attributes) {
    if (!baselineComparisonHistogram || !isPerformanceMonitoringEnabled) {
        return;
    }
    if (attributes.baseline_value === 0) {
        diag.warn('Baseline value is zero, skipping comparison.');
        return;
    }
    const percentageChange = ((attributes.current_value - attributes.baseline_value) /
        attributes.baseline_value) *
        100;
    const metricAttributes = {
        ...baseMetricDefinition.getCommonAttributes(config),
        ...attributes
    };
    baselineComparisonHistogram.record(percentageChange, metricAttributes);
}
// Utility function to check if performance monitoring is enabled
export function isPerformanceMonitoringActive() {
    return isPerformanceMonitoringEnabled && isMetricsInitialized;
}
/**
 * Records a metric for subagent execution events.
 */
export function recordSubagentExecutionMetrics(config, subagentName, status, terminateReason) {
    if (!subagentExecutionCounter || !isMetricsInitialized) {
        return;
    }
    const attributes = {
        ...baseMetricDefinition.getCommonAttributes(config),
        subagent_name: subagentName,
        status
    };
    if (terminateReason) {
        attributes.terminate_reason = terminateReason;
    }
    subagentExecutionCounter.add(1, attributes);
}
// ─── Arena Metric Recording Functions ───────────────────────────
export function recordArenaSessionStartedMetrics(config) {
    if (!isMetricsInitialized) {
        return;
    }
    arenaSessionCounter?.add(1, {
        ...baseMetricDefinition.getCommonAttributes(config),
        status: 'started'
    });
}
export function recordArenaAgentCompletedMetrics(config, modelId, status, durationMs, inputTokens, outputTokens) {
    if (!isMetricsInitialized) {
        return;
    }
    const common = baseMetricDefinition.getCommonAttributes(config);
    arenaAgentCounter?.add(1, {
        ...common,
        status,
        model_id: modelId
    });
    arenaAgentDurationHistogram?.record(durationMs, {
        ...common,
        model_id: modelId
    });
    if (inputTokens > 0) {
        arenaAgentTokensCounter?.add(inputTokens, {
            ...common,
            model_id: modelId,
            type: 'input'
        });
    }
    if (outputTokens > 0) {
        arenaAgentTokensCounter?.add(outputTokens, {
            ...common,
            model_id: modelId,
            type: 'output'
        });
    }
}
export function recordArenaSessionEndedMetrics(config, status, displayBackend, durationMs, winnerModelId) {
    if (!isMetricsInitialized) {
        return;
    }
    const common = baseMetricDefinition.getCommonAttributes(config);
    arenaSessionCounter?.add(1, {
        ...common,
        status,
        ...(displayBackend ? { display_backend: displayBackend } : {})
    });
    if (durationMs !== undefined && arenaSessionDurationHistogram) {
        arenaSessionDurationHistogram.record(durationMs, {
            ...common,
            status
        });
    }
    if (winnerModelId) {
        arenaResultSelectedCounter?.add(1, {
            ...common,
            model_id: winnerModelId
        });
    }
}
//# sourceMappingURL=metrics.js.map