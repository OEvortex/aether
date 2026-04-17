/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Generic multi-source configuration resolver utilities.
 *
 * This module provides reusable tools for resolving configuration values
 * from multiple sources (CLI, env, settings, etc.) with priority ordering
 * and source tracking.
 */
/**
 * Known source kinds for configuration values.
 * Extensible for domain-specific needs.
 */
export type ConfigSourceKind = 'cli' | 'env' | 'settings' | 'modelProviders' | 'default' | 'computed' | 'programmatic' | 'unknown';
/**
 * Source metadata for a configuration value.
 * Tracks where the value came from for debugging and UI display.
 */
export interface ConfigSource {
    /** The kind/category of the source */
    kind: ConfigSourceKind;
    /** Additional detail about the source (e.g., '--model' for CLI) */
    detail?: string;
    /** Environment variable key if kind is 'env' */
    envKey?: string;
    /** Settings path if kind is 'settings' (e.g., 'model.name') */
    settingsPath?: string;
    /** Auth type if relevant (for modelProviders) */
    authType?: string;
    /** Model ID if relevant (for modelProviders) */
    modelId?: string;
    /** Indirect source - when a value is derived via another source */
    via?: Omit<ConfigSource, 'via'>;
}
/**
 * Map of field names to their sources
 */
export type ConfigSources = Record<string, ConfigSource>;
/**
 * A configuration layer represents a potential source for a value.
 * Layers are evaluated in priority order (first non-undefined wins).
 */
export interface ConfigLayer<T> {
    /** The value from this layer (undefined means not present) */
    value: T | undefined;
    /** Source metadata for this layer */
    source: ConfigSource;
}
/**
 * Result of resolving a single field
 */
export interface ResolvedField<T> {
    /** The resolved value */
    value: T;
    /** Source metadata indicating where the value came from */
    source: ConfigSource;
}
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
export declare function resolveField<T>(layers: Array<ConfigLayer<T>>, defaultValue: T, defaultSource?: ConfigSource): ResolvedField<T>;
/**
 * Resolve a field that may not have a default (optional field).
 *
 * @param layers - Configuration layers in priority order
 * @returns The resolved value and source, or undefined if not found
 */
export declare function resolveOptionalField<T>(layers: Array<ConfigLayer<T>>): ResolvedField<T> | undefined;
/**
 * Create a CLI source descriptor
 */
export declare function cliSource(detail: string): ConfigSource;
/**
 * Create a settings source descriptor
 */
export declare function settingsSource(settingsPath: string): ConfigSource;
/**
 * Create a modelProviders source descriptor
 */
export declare function modelProvidersSource(authType: string, modelId: string, detail?: string): ConfigSource;
/**
 * Create a default value source descriptor
 */
export declare function defaultSource(detail?: string): ConfigSource;
/**
 * Create a computed value source descriptor
 */
export declare function computedSource(detail?: string): ConfigSource;
/**
 * Create a layer from an environment variable
 */
export declare function envLayer<T = string>(env: Record<string, string | undefined>, key: string, transform?: (value: string) => T): ConfigLayer<T>;
/**
 * Create a layer with a static value and source
 */
export declare function layer<T>(value: T | undefined, source: ConfigSource): ConfigLayer<T>;
