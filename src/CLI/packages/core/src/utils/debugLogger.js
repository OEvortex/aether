/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import { Storage } from '../config/storage.js';
import { updateSymlink } from './symlink.js';
let ensureDebugDirPromise = null;
let ensuredDebugDirPath = null;
let hasWriteFailure = false;
let globalSession = null;
const sessionContext = new AsyncLocalStorage();
function isDebugLogFileEnabled() {
    const value = process.env.AETHER_DEBUG_LOG_FILE;
    if (!value) {
        return true;
    }
    const normalized = value.trim().toLowerCase();
    return !['0', 'false', 'off', 'no'].includes(normalized);
}
function getActiveSession() {
    return sessionContext.getStore() ?? globalSession;
}
function ensureDebugDirExists() {
    const debugDirPath = Storage.getGlobalDebugDir();
    if (!ensureDebugDirPromise || ensuredDebugDirPath !== debugDirPath) {
        ensuredDebugDirPath = debugDirPath;
        ensureDebugDirPromise = fs
            .mkdir(debugDirPath, { recursive: true })
            .then(() => undefined)
            .catch(() => {
            hasWriteFailure = true;
            ensureDebugDirPromise = null;
            ensuredDebugDirPath = null;
        });
    }
    return ensureDebugDirPromise ?? Promise.resolve();
}
function formatArgs(args) {
    return args
        .map((arg) => {
        if (arg instanceof Error) {
            return arg.stack ?? `${arg.name}: ${arg.message}`;
        }
        return arg;
    })
        .map((arg) => (typeof arg === 'string' ? arg : util.inspect(arg)))
        .join(' ');
}
/**
 * Builds a log line in the format:
 * `2026-01-23T06:58:02.011Z [DEBUG] [TAG] message`
 *
 * Tag is optional. If not provided, format is:
 * `2026-01-23T06:58:02.011Z [DEBUG] message`
 */
function buildLogLine(level, message, tag) {
    const timestamp = new Date().toISOString();
    const tagPart = tag ? ` [${tag}]` : '';
    return `${timestamp} [${level}]${tagPart} ${message}\n`;
}
function writeLog(session, level, tag, args) {
    if (!isDebugLogFileEnabled()) {
        return;
    }
    const sessionId = session.getSessionId();
    const logFilePath = Storage.getDebugLogPath(sessionId);
    const message = formatArgs(args);
    const line = buildLogLine(level, message, tag);
    void ensureDebugDirExists()
        .then(() => fs.appendFile(logFilePath, line, 'utf8'))
        .catch(() => {
        hasWriteFailure = true;
    });
}
/**
 * Returns true if any debug log write has failed.
 * Used by the UI to show a degraded mode notice on startup.
 */
export function isDebugLoggingDegraded() {
    return hasWriteFailure;
}
/**
 * Resets the write failure tracking state.
 * Primarily useful for testing.
 */
export function resetDebugLoggingState() {
    hasWriteFailure = false;
    ensureDebugDirPromise = null;
    ensuredDebugDirPath = null;
}
const DEBUG_LATEST_ALIAS = 'latest';
function updateLatestDebugLogAlias(sessionId) {
    if (!isDebugLogFileEnabled()) {
        return;
    }
    const aliasPath = path.join(Storage.getGlobalDebugDir(), DEBUG_LATEST_ALIAS);
    const targetPath = Storage.getDebugLogPath(sessionId);
    void ensureDebugDirExists()
        .then(() => updateSymlink(aliasPath, targetPath, { fallbackCopy: false }))
        .catch(() => {
        // Best-effort; don't degrade overall logging
    });
}
/**
 * Sets the process-wide debug log session used by createDebugLogger().
 *
 * This is the default session used when there is no async-local session bound
 * via runWithDebugLogSession().
 */
export function setDebugLogSession(session) {
    globalSession = session ?? null;
    if (session) {
        updateLatestDebugLogAlias(session.getSessionId());
    }
}
/**
 * Runs a function with a session bound to the current async context.
 *
 * This is optional; createDebugLogger() falls back to the process-wide session
 * set via setDebugLogSession().
 */
export function runWithDebugLogSession(session, fn) {
    return sessionContext.run(session, fn);
}
/**
 * Creates a debug logger that writes to the current debug log session.
 *
 * Session resolution order:
 * 1) async-local session (runWithDebugLogSession)
 * 2) process-wide session (setDebugLogSession)
 */
export function createDebugLogger(tag) {
    return {
        debug: (...args) => {
            const session = getActiveSession();
            if (!session) {
                return;
            }
            writeLog(session, 'DEBUG', tag, args);
        },
        info: (...args) => {
            const session = getActiveSession();
            if (!session) {
                return;
            }
            writeLog(session, 'INFO', tag, args);
        },
        warn: (...args) => {
            const session = getActiveSession();
            if (!session) {
                return;
            }
            writeLog(session, 'WARN', tag, args);
        },
        error: (...args) => {
            const session = getActiveSession();
            if (!session) {
                return;
            }
            writeLog(session, 'ERROR', tag, args);
        }
    };
}
//# sourceMappingURL=debugLogger.js.map