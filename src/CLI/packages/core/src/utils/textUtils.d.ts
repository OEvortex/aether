/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Safely replaces text with literal strings, avoiding ECMAScript GetSubstitution issues.
 * Escapes $ characters to prevent template interpretation.
 */
export declare function safeLiteralReplace(str: string, oldString: string, newString: string): string;
/**
 * Checks if a Buffer is likely binary by testing for the presence of a NULL byte.
 * The presence of a NULL byte is a strong indicator that the data is not plain text.
 * @param data The Buffer to check.
 * @param sampleSize The number of bytes from the start of the buffer to test.
 * @returns True if a NULL byte is found, false otherwise.
 */
export declare function isBinary(data: Buffer | null | undefined, sampleSize?: number): boolean;
/**
 * Normalizes text content by stripping the UTF-8 BOM and converting all CRLF (\r\n)
 * or standalone CR (\r) line endings to LF (\n).
 *
 * This is crucial for cross-platform compatibility, particularly to prevent parsing
 * failures on Windows where files may be saved with CRLF line endings.
 *
 * @param content The raw text content to normalize
 * @returns The normalized string with uniform \n line endings
 */
export declare function normalizeContent(content: string): string;
