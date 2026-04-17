/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Resolve a single configuration field from multiple layers.
 *
 * Layers are evaluated in order. The first layer with a defined,
 * non-empty value wins. If no layer has a value, the default is used.
 *
 * @param layers - Configuration layers in priority order (highest first)
 * @param defaultValue - Default value if no layer provides one
 * @param defaultSource - Source metadata for the default value
 * @returns The resolved value and its source
 *
 * @example
 * ```typescript
 * const model = resolveField(
 *   [
 *     { value: argv.model, source: { kind: 'cli', detail: '--model' } },
 *     { value: env['OPENAI_MODEL'], source: { kind: 'env', envKey: 'OPENAI_MODEL' } },
 *     { value: settings.model, source: { kind: 'settings', settingsPath: 'model.name' } },
 *   ],
 *   'default-model',
 *   { kind: 'default', detail: 'default-model' }
 * );
 * ```
 */
export function resolveField(layers, defaultValue, defaultSource = { kind: 'default' }) {
    for (const layer of layers) {
        if (isValuePresent(layer.value)) {
            return { value: layer.value, source: layer.source };
        }
    }
    return { value: defaultValue, source: defaultSource };
}
/**
 * Resolve a field that may not have a default (optional field).
 *
 * @param layers - Configuration layers in priority order
 * @returns The resolved value and source, or undefined if not found
 */
export function resolveOptionalField(layers) {
    for (const layer of layers) {
        if (isValuePresent(layer.value)) {
            return { value: layer.value, source: layer.source };
        }
    }
    return undefined;
}
/**
 * Check if a value is "present" (not undefined, not null, not empty string).
 *
 * @param value - The value to check
 * @returns true if the value should be considered present
 */
function isValuePresent(value) {
    if (value === undefined || value === null) {
        return false;
    }
    // Treat empty strings as not present
    if (typeof value === 'string' && value.trim() === '') {
        return false;
    }
    return true;
}
/**
 * Create a CLI source descriptor
 */
export function cliSource(detail) {
    return { kind: 'cli', detail };
}
/**
 * Create an environment variable source descriptor
 */
function envSource(envKey) {
    return { kind: 'env', envKey };
}
/**
 * Create a settings source descriptor
 */
export function settingsSource(settingsPath) {
    return { kind: 'settings', settingsPath };
}
/**
 * Create a modelProviders source descriptor
 */
export function modelProvidersSource(authType, modelId, detail) {
    return { kind: 'modelProviders', authType, modelId, detail };
}
/**
 * Create a default value source descriptor
 */
export function defaultSource(detail) {
    return { kind: 'default', detail };
}
/**
 * Create a computed value source descriptor
 */
export function computedSource(detail) {
    return { kind: 'computed', detail };
}
/**
 * Create a layer from an environment variable
 */
export function envLayer(env, key, transform) {
    const rawValue = env[key];
    const value = rawValue !== undefined
        ? transform
            ? transform(rawValue)
            : rawValue
        : undefined;
    return {
        value,
        source: envSource(key)
    };
}
/**
 * Create a layer with a static value and source
 */
export function layer(value, source) {
    return { value, source };
}
//# sourceMappingURL=configResolver.js.map