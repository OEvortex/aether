/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ExtensionSetting } from './extensionSettings.js';
/**
 * Parse .env file content into key-value pairs.
 * Simple parser that handles:
 * - KEY=VALUE format
 * - Comments starting with #
 * - Empty lines
 */
export declare function parseEnvFile(content: string): Record<string, string>;
/**
 * Generate .env file content from key-value pairs.
 */
export declare function generateEnvFile(settings: Record<string, string>): string;
/**
 * Load settings from extension .env file.
 */
export declare function loadExtensionSettings(extensionPath: string): Promise<Record<string, string>>;
/**
 * Save settings to extension .env file.
 */
export declare function saveExtensionSettings(extensionPath: string, settings: Record<string, string>): Promise<void>;
/**
 * Validate settings against configuration.
 * Returns array of validation errors (empty if valid).
 *
 * Note: This validates that environment variables are properly set.
 * In Gemini Extension format, all settings are treated as strings.
 */
export declare function validateSettings(settings: Record<string, string>, settingsConfig: ExtensionSetting[]): string[];
/**
 * Merge extension settings into process environment.
 * This allows MCP servers and other extension components to access settings.
 */
export declare function applySettingsToEnv(settings: Record<string, string>): void;
