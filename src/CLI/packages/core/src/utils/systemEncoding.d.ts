/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Reset the encoding cache - useful for testing
 */
export declare function resetEncodingCache(): void;
/**
 * Detects the encoding of a buffer.
 *
 * Strategy: try UTF-8 first, then chardet, then system encoding.
 * UTF-8 is tried first because modern developer tools, PowerShell Core,
 * git, node, and most CLI tools output UTF-8. Legacy codepage bytes
 * (0x80-0xFF) rarely form valid multi-byte UTF-8 sequences by accident.
 *
 * This function should be called on the **complete** output buffer
 * (after the command finishes), not on individual streaming chunks,
 * to avoid misdetection when early chunks are ASCII-only.
 *
 * @param buffer A buffer to analyze for encoding detection.
 */
export declare function getCachedEncodingForBuffer(buffer: Buffer): string;
/**
 * Detects the system encoding based on the platform.
 * For Windows, it uses the 'chcp' command to get the current code page.
 * For Unix-like systems, it checks environment variables like LC_ALL, LC_CTYPE, and LANG.
 * If those are not set, it tries to run 'locale charmap' to get the encoding.
 * If detection fails, it returns null.
 * @returns The system encoding as a string, or null if detection fails.
 */
export declare function getSystemEncoding(): string | null;
/**
 * Converts a Windows code page number to a corresponding encoding name.
 * @param cp The Windows code page number (e.g., 437, 850, etc.)
 * @returns The corresponding encoding name as a string, or null if no mapping exists.
 */
export declare function windowsCodePageToEncoding(cp: number): string | null;
/**
 * Attempts to detect the encoding of a non-UTF-8 buffer using chardet
 * statistical analysis. Returns null when chardet cannot determine the
 * encoding (e.g. the buffer is too small or ambiguous).
 *
 * Callers that need a guaranteed result should provide their own fallback
 * (e.g. {@link getCachedEncodingForBuffer} falls back to the system codepage).
 *
 * @param buffer The buffer to analyze for encoding.
 * @return The detected encoding as a lowercase string, or null if detection fails.
 */
export declare function detectEncodingFromBuffer(buffer: Buffer): string | null;
