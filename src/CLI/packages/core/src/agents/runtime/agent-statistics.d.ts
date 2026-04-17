/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
export interface ToolUsageStats {
    name: string;
    count: number;
    success: number;
    failure: number;
    lastError?: string;
    totalDurationMs: number;
    averageDurationMs: number;
}
export interface AgentStatsSummary {
    rounds: number;
    totalDurationMs: number;
    totalToolCalls: number;
    successfulToolCalls: number;
    failedToolCalls: number;
    successRate: number;
    inputTokens: number;
    outputTokens: number;
    thoughtTokens: number;
    cachedTokens: number;
    totalTokens: number;
    toolUsage: ToolUsageStats[];
}
export declare class AgentStatistics {
    private startTimeMs;
    private rounds;
    private totalToolCalls;
    private successfulToolCalls;
    private failedToolCalls;
    private inputTokens;
    private outputTokens;
    private thoughtTokens;
    private cachedTokens;
    private apiTotalTokens;
    private toolUsage;
    start(now?: number): void;
    setRounds(rounds: number): void;
    recordToolCall(name: string, success: boolean, durationMs: number, lastError?: string): void;
    recordTokens(input: number, output: number, thought?: number, cached?: number, total?: number): void;
    getSummary(now?: number): AgentStatsSummary;
    formatCompact(taskDesc: string, now?: number): string;
    formatDetailed(taskDesc: string, now?: number): string;
    private fmtDuration;
    private generatePerformanceTips;
}
