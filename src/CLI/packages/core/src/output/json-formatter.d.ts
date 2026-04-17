/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { SessionMetrics } from '../telemetry/uiTelemetry.js';
import type { JsonError } from './types.js';
export declare class JsonFormatter {
    format(response?: string, stats?: SessionMetrics, error?: JsonError): string;
    formatError(error: Error, code?: string | number): string;
}
