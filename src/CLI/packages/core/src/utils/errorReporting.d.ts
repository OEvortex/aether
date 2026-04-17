/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Content } from '@google/genai';
/**
 * Generates an error report and writes it to the debug log.
 * @param error The error object.
 * @param baseMessage The base message describing the error context.
 * @param context The relevant context (e.g., chat history, request contents).
 * @param type A string to identify the type of error (e.g., 'startChat', 'generateJson-api').
 */
export declare function reportError(error: Error | unknown, baseMessage: string, context?: Content[] | Record<string, unknown> | unknown[], type?: string): Promise<void>;
