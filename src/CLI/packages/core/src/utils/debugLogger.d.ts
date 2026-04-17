/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface DebugLogSession {
    getSessionId: () => string;
}
export interface DebugLogger {
    debug: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
}
/**
 * Returns true if any debug log write has failed.
 * Used by the UI to show a degraded mode notice on startup.
 */
export declare function isDebugLoggingDegraded(): boolean;
/**
 * Resets the write failure tracking state.
 * Primarily useful for testing.
 */
export declare function resetDebugLoggingState(): void;
/**
 * Sets the process-wide debug log session used by createDebugLogger().
 *
 * This is the default session used when there is no async-local session bound
 * via runWithDebugLogSession().
 */
export declare function setDebugLogSession(session: DebugLogSession | null | undefined): void;
/**
 * Runs a function with a session bound to the current async context.
 *
 * This is optional; createDebugLogger() falls back to the process-wide session
 * set via setDebugLogSession().
 */
export declare function runWithDebugLogSession<T>(session: DebugLogSession, fn: () => T): T;
/**
 * Creates a debug logger that writes to the current debug log session.
 *
 * Session resolution order:
 * 1) async-local session (runWithDebugLogSession)
 * 2) process-wide session (setDebugLogSession)
 */
export declare function createDebugLogger(tag?: string): DebugLogger;
