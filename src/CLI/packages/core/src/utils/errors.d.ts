/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export declare function isNodeError(error: unknown): error is NodeJS.ErrnoException;
/**
 * Check if the error is an abort error (user cancellation).
 * This handles both DOMException-style AbortError and Node.js abort errors.
 */
export declare function isAbortError(error: unknown): boolean;
export declare function getErrorMessage(error: unknown): string;
/**
 * Extracts the HTTP status code from an error object.
 *
 * Checks the following properties in order of priority:
 * 1. `error.status` - OpenAI, Anthropic, Gemini SDK errors
 * 2. `error.statusCode` - Some HTTP client libraries
 * 3. `error.response.status` - Axios-style errors
 * 4. `error.error.code` - Nested error objects
 *
 * @returns The HTTP status code (100-599), or undefined if not found.
 */
export declare function getErrorStatus(error: unknown): number | undefined;
/**
 * Extracts a descriptive error type string from an error object.
 *
 * Uses the error's constructor name (e.g. "APIConnectionError",
 * "APIConnectionTimeoutError") which is more specific than the generic
 * `.type` field. Falls back to `.type` for SDK errors that set it,
 * then to `error.name`, then "unknown".
 *
 * For network errors, appends the cause code (e.g. "ECONNREFUSED")
 * when available.
 *
 * @returns A string identifying the error type.
 */
export declare function getErrorType(error: unknown): string;
export declare class FatalError extends Error {
    readonly exitCode: number;
    constructor(message: string, exitCode: number);
}
export declare class FatalAuthenticationError extends FatalError {
    constructor(message: string);
}
export declare class FatalInputError extends FatalError {
    constructor(message: string);
}
export declare class FatalSandboxError extends FatalError {
    constructor(message: string);
}
export declare class FatalConfigError extends FatalError {
    constructor(message: string);
}
export declare class FatalTurnLimitedError extends FatalError {
    constructor(message: string);
}
export declare class FatalToolExecutionError extends FatalError {
    constructor(message: string);
}
export declare class FatalCancellationError extends FatalError {
    constructor(message: string);
}
export declare class ForbiddenError extends Error {
}
export declare class UnauthorizedError extends Error {
}
export declare class BadRequestError extends Error {
}
export declare function toFriendlyError(error: unknown): unknown;
