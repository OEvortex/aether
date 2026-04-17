/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Decode a buffer using the specified encoding.
 * @param buffer The buffer to decode
 * @param encoding The encoding to use (e.g. 'gbk', 'big5', 'shift_jis')
 * @returns The decoded string
 */
export declare function iconvDecode(buffer: Buffer, encoding: string): string;
/**
 * Encode a string to a buffer using the specified encoding.
 * @param content The string to encode
 * @param encoding The encoding to use (e.g. 'gbk', 'big5', 'shift_jis')
 * @returns The encoded buffer
 */
export declare function iconvEncode(content: string, encoding: string): Buffer;
/**
 * Check if an encoding is supported by iconv-lite.
 * @param encoding The encoding name to check
 * @returns True if the encoding is supported
 */
export declare function iconvEncodingExists(encoding: string): boolean;
/**
 * Check whether an encoding name represents a UTF-8 compatible encoding
 * that Node's Buffer can handle natively without iconv-lite.
 * Normalizes encoding names (e.g. 'utf-8', 'UTF8', 'us-ascii' all match).
 * @param encoding The encoding name to check
 * @returns True if the encoding is UTF-8 or ASCII compatible
 */
export declare function isUtf8CompatibleEncoding(encoding: string): boolean;
