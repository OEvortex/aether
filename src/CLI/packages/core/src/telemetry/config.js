/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { FatalConfigError } from '../utils/errors.js';
import { TelemetryTarget } from './index.js';
/**
 * Parse a boolean environment flag. Accepts 'true'/'1' as true.
 */
export function parseBooleanEnvFlag(value) {
    if (value === undefined) {
        return undefined;
    }
    return value === 'true' || value === '1';
}
/**
 * Normalize a telemetry target value into TelemetryTarget or undefined.
 */
export function parseTelemetryTargetValue(value) {
    if (value === undefined) {
        return undefined;
    }
    if (value === TelemetryTarget.LOCAL || value === 'local') {
        return TelemetryTarget.LOCAL;
    }
    if (value === TelemetryTarget.GCP || value === 'gcp') {
        return TelemetryTarget.GCP;
    }
    return undefined;
}
/**
 * Build TelemetrySettings by resolving from argv (highest), env, then settings.
 */
export async function resolveTelemetrySettings(options) {
    const argv = options.argv ?? {};
    const env = options.env ?? {};
    const settings = options.settings ?? {};
    const enabled = argv.telemetry ??
        parseBooleanEnvFlag(env.QWEN_TELEMETRY_ENABLED) ??
        settings.enabled;
    const rawTarget = argv.telemetryTarget ??
        env.QWEN_TELEMETRY_TARGET ??
        settings.target;
    const target = parseTelemetryTargetValue(rawTarget);
    if (rawTarget !== undefined && target === undefined) {
        throw new FatalConfigError(`Invalid telemetry target: ${String(rawTarget)}. Valid values are: local, gcp`);
    }
    const otlpEndpoint = argv.telemetryOtlpEndpoint ??
        env.QWEN_TELEMETRY_OTLP_ENDPOINT ??
        env.OTEL_EXPORTER_OTLP_ENDPOINT ??
        settings.otlpEndpoint;
    const rawProtocol = argv.telemetryOtlpProtocol ??
        env.QWEN_TELEMETRY_OTLP_PROTOCOL ??
        settings.otlpProtocol;
    const otlpProtocol = ['grpc', 'http'].find((p) => p === rawProtocol);
    if (rawProtocol !== undefined && otlpProtocol === undefined) {
        throw new FatalConfigError(`Invalid telemetry OTLP protocol: ${String(rawProtocol)}. Valid values are: grpc, http`);
    }
    const logPrompts = argv.telemetryLogPrompts ??
        parseBooleanEnvFlag(env.QWEN_TELEMETRY_LOG_PROMPTS) ??
        settings.logPrompts;
    const outfile = argv.telemetryOutfile ?? env.QWEN_TELEMETRY_OUTFILE ?? settings.outfile;
    const useCollector = parseBooleanEnvFlag(env.QWEN_TELEMETRY_USE_COLLECTOR) ??
        settings.useCollector;
    return {
        enabled,
        target,
        otlpEndpoint,
        otlpProtocol,
        logPrompts,
        outfile,
        useCollector
    };
}
//# sourceMappingURL=config.js.map