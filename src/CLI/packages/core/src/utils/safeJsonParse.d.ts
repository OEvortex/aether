/**
 * @license
 * Copyright 2026 OEvortex
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Safely parse JSON string with jsonrepair fallback for malformed JSON.
 * This function attempts to parse JSON normally first, and if that fails,
 * it uses jsonrepair to fix common JSON formatting issues before parsing.
 *
 * @param jsonString - The JSON string to parse
 * @param fallbackValue - The value to return if parsing fails completely
 * @returns The parsed object or the fallback value
 */
export declare function safeJsonParse<T = Record<string, unknown>>(jsonString: string, fallbackValue?: T): T;
