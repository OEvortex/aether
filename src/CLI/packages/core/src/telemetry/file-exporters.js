/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as fs from 'node:fs';
import { ExportResultCode } from '@opentelemetry/core';
import { AggregationTemporality } from '@opentelemetry/sdk-metrics';
class FileExporter {
    writeStream;
    constructor(filePath) {
        this.writeStream = fs.createWriteStream(filePath, { flags: 'a' });
    }
    serialize(data) {
        return `${JSON.stringify(data, null, 2)}\n`;
    }
    shutdown() {
        return new Promise((resolve) => {
            this.writeStream.end(resolve);
        });
    }
}
export class FileSpanExporter extends FileExporter {
    export(spans, resultCallback) {
        const data = spans.map((span) => this.serialize(span)).join('');
        this.writeStream.write(data, (err) => {
            resultCallback({
                code: err ? ExportResultCode.FAILED : ExportResultCode.SUCCESS,
                error: err || undefined
            });
        });
    }
}
export class FileLogExporter extends FileExporter {
    export(logs, resultCallback) {
        const data = logs.map((log) => this.serialize(log)).join('');
        this.writeStream.write(data, (err) => {
            resultCallback({
                code: err ? ExportResultCode.FAILED : ExportResultCode.SUCCESS,
                error: err || undefined
            });
        });
    }
}
export class FileMetricExporter extends FileExporter {
    export(metrics, resultCallback) {
        const data = this.serialize(metrics);
        this.writeStream.write(data, (err) => {
            resultCallback({
                code: err ? ExportResultCode.FAILED : ExportResultCode.SUCCESS,
                error: err || undefined
            });
        });
    }
    getPreferredAggregationTemporality() {
        return AggregationTemporality.CUMULATIVE;
    }
    async forceFlush() {
        return Promise.resolve();
    }
}
//# sourceMappingURL=file-exporters.js.map