/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { TelemetrySettings } from '../config/config.js';
import { TelemetryTarget } from './index.js';
/**
 * Parse a boolean environment flag. Accepts 'true'/'1' as true.
 */
export declare function parseBooleanEnvFlag(value: string | undefined): boolean | undefined;
/**
 * Normalize a telemetry target value into TelemetryTarget or undefined.
 */
export declare function parseTelemetryTargetValue(value: string | TelemetryTarget | undefined): TelemetryTarget | undefined;
export interface TelemetryArgOverrides {
    telemetry?: boolean;
    telemetryTarget?: string | TelemetryTarget;
    telemetryOtlpEndpoint?: string;
    telemetryOtlpProtocol?: string;
    telemetryLogPrompts?: boolean;
    telemetryOutfile?: string;
}
/**
 * Build TelemetrySettings by resolving from argv (highest), env, then settings.
 */
export declare function resolveTelemetrySettings(options: {
    argv?: TelemetryArgOverrides;
    env?: Record<string, string | undefined>;
    settings?: TelemetrySettings;
}): Promise<TelemetrySettings>;
