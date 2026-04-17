/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { EventEmitter } from 'node:events';
import { EVENT_API_ERROR, EVENT_API_RESPONSE, EVENT_TOOL_CALL } from './constants.js';
import { ToolCallDecision } from './tool-call-decision.js';
import type { ApiErrorEvent, ApiResponseEvent, ToolCallEvent } from './types.js';
export type UiEvent = (ApiResponseEvent & {
    'event.name': typeof EVENT_API_RESPONSE;
}) | (ApiErrorEvent & {
    'event.name': typeof EVENT_API_ERROR;
}) | (ToolCallEvent & {
    'event.name': typeof EVENT_TOOL_CALL;
});
export { EVENT_API_ERROR, EVENT_API_RESPONSE, EVENT_TOOL_CALL } from './constants.js';
export interface ToolCallStats {
    count: number;
    success: number;
    fail: number;
    durationMs: number;
    decisions: {
        [ToolCallDecision.ACCEPT]: number;
        [ToolCallDecision.REJECT]: number;
        [ToolCallDecision.MODIFY]: number;
        [ToolCallDecision.AUTO_ACCEPT]: number;
    };
}
export interface ModelMetrics {
    api: {
        totalRequests: number;
        totalErrors: number;
        totalLatencyMs: number;
    };
    tokens: {
        prompt: number;
        candidates: number;
        total: number;
        cached: number;
        thoughts: number;
        tool: number;
    };
}
export interface SessionMetrics {
    models: Record<string, ModelMetrics>;
    tools: {
        totalCalls: number;
        totalSuccess: number;
        totalFail: number;
        totalDurationMs: number;
        totalDecisions: {
            [ToolCallDecision.ACCEPT]: number;
            [ToolCallDecision.REJECT]: number;
            [ToolCallDecision.MODIFY]: number;
            [ToolCallDecision.AUTO_ACCEPT]: number;
        };
        byName: Record<string, ToolCallStats>;
    };
    files: {
        totalLinesAdded: number;
        totalLinesRemoved: number;
    };
}
export declare class UiTelemetryService extends EventEmitter {
    #private;
    addEvent(event: UiEvent): void;
    getMetrics(): SessionMetrics;
    getLastPromptTokenCount(): number;
    setLastPromptTokenCount(lastPromptTokenCount: number): void;
    getLastCachedContentTokenCount(): number;
    setLastCachedContentTokenCount(count: number): void;
    /**
     * Resets metrics to the initial state (used when resuming a session).
     */
    reset(): void;
    private getOrCreateModelMetrics;
    private processApiResponse;
    private processApiError;
    private processToolCall;
}
export declare const uiTelemetryService: UiTelemetryService;
