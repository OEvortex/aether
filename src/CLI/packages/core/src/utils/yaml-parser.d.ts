/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Simple YAML parser for subagent frontmatter.
 * This is a minimal implementation that handles the basic YAML structures
 * needed for subagent configuration files.
 */
/**
 * Parses a simple YAML string into a JavaScript object.
 * Supports basic key-value pairs, arrays, and nested objects.
 *
 * @param yamlString - YAML string to parse
 * @returns Parsed object
 */
export declare function parse(yamlString: string): Record<string, unknown>;
/**
 * Converts a JavaScript object to a simple YAML string.
 *
 * @param obj - Object to stringify
 * @param options - Stringify options
 * @returns YAML string
 */
export declare function stringify(obj: Record<string, unknown>, _options?: {
    lineWidth?: number;
    minContentWidth?: number;
}): string;
