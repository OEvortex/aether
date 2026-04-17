/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface TomlCommandFormat {
    prompt: string;
    description?: string;
}
/**
 * Converts a TOML command content to Markdown format.
 * @param tomlContent The TOML file content
 * @returns The equivalent Markdown content
 * @throws Error if TOML parsing fails
 */
export declare function convertTomlToMarkdown(tomlContent: string): string;
/**
 * Checks if a file content is in TOML format by attempting to parse it.
 * @param content File content to check
 * @returns true if content is valid TOML
 */
export declare function isTomlFormat(content: string): boolean;
