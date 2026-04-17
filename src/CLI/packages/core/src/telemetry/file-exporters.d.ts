/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as fs from 'node:fs';
import type { ExportResult } from '@opentelemetry/core';
import type { LogRecordExporter, ReadableLogRecord } from '@opentelemetry/sdk-logs';
import type { PushMetricExporter, ResourceMetrics } from '@opentelemetry/sdk-metrics';
import { AggregationTemporality } from '@opentelemetry/sdk-metrics';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
declare class FileExporter {
    protected writeStream: fs.WriteStream;
    constructor(filePath: string);
    protected serialize(data: unknown): string;
    shutdown(): Promise<void>;
}
export declare class FileSpanExporter extends FileExporter implements SpanExporter {
    export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void;
}
export declare class FileLogExporter extends FileExporter implements LogRecordExporter {
    export(logs: ReadableLogRecord[], resultCallback: (result: ExportResult) => void): void;
}
export declare class FileMetricExporter extends FileExporter implements PushMetricExporter {
    export(metrics: ResourceMetrics, resultCallback: (result: ExportResult) => void): void;
    getPreferredAggregationTemporality(): AggregationTemporality;
    forceFlush(): Promise<void>;
}
export {};
