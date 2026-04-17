/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { SessionMetrics } from '../telemetry/uiTelemetry.js';
export declare enum InputFormat {
    TEXT = "text",
    STREAM_JSON = "stream-json"
}
export declare enum OutputFormat {
    TEXT = "text",
    JSON = "json",
    STREAM_JSON = "stream-json"
}
export interface JsonError {
    type: string;
    message: string;
    code?: string | number;
}
export interface JsonOutput {
    response?: string;
    stats?: SessionMetrics;
    error?: JsonError;
}
