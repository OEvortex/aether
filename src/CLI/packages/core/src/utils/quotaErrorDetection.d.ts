/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { StructuredError } from '../core/turn.js';
export interface ApiError {
    error: {
        code: number;
        message: string;
        status: string;
        details: unknown[];
    };
}
export declare function isApiError(error: unknown): error is ApiError;
export declare function isStructuredError(error: unknown): error is StructuredError;
export declare function isProQuotaExceededError(error: unknown): boolean;
export declare function isGenericQuotaExceededError(error: unknown): boolean;
export declare function isQwenQuotaExceededError(error: unknown): boolean;
