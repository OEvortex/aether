/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview ITermBackend implements Backend using the it2 CLI
 * (iTerm2 Python API).
 *
 * Each agent runs in its own iTerm2 split pane. The backend manages pane
 * creation, exit detection (via exit marker file polling), and cleanup.
 *
 * Exit detection uses a file-based marker approach: each agent's command is
 * wrapped to write its exit code to a temp file on completion, which the backend
 * polls to detect exits.
 */
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { createDebugLogger } from '../../utils/debugLogger.js';
import { itermCloseSession, itermFocusSession, itermRunCommand, itermSendText, itermSplitPane, verifyITerm } from './iterm-it2.js';
import { DISPLAY_MODE } from './types.js';
const debugLogger = createDebugLogger('ITERM_BACKEND');
/** Polling interval for exit detection (ms) */
const EXIT_POLL_INTERVAL_MS = 500;
export class ITermBackend {
    type = DISPLAY_MODE.ITERM2;
    /** Directory for exit marker files */
    exitMarkerDir;
    /** Session ID of the last agent pane (split source) */
    lastSplitSessionId = null;
    sessions = new Map();
    agentOrder = [];
    activeAgentId = null;
    onExitCallback = null;
    exitPollTimer = null;
    initialized = false;
    /** Number of agents currently being spawned asynchronously */
    pendingSpawns = 0;
    /** Queue to serialize spawn operations (prevents split race conditions) */
    spawnQueue = Promise.resolve();
    constructor() {
        this.exitMarkerDir = path.join(os.tmpdir(), `agent-iterm-exit-${Date.now().toString(36)}`);
    }
    async init() {
        if (this.initialized) {
            return;
        }
        await verifyITerm();
        // Create the exit marker directory
        await fs.mkdir(this.exitMarkerDir, { recursive: true });
        this.initialized = true;
        debugLogger.info('ITermBackend initialized');
    }
    // ─── Agent Lifecycle ────────────────────────────────────────
    async spawnAgent(config) {
        if (!this.initialized) {
            throw new Error('ITermBackend not initialized. Call init() first.');
        }
        if (this.sessions.has(config.agentId)) {
            throw new Error(`Agent "${config.agentId}" already exists.`);
        }
        const exitMarkerPath = path.join(this.exitMarkerDir, config.agentId);
        await fs.mkdir(path.dirname(exitMarkerPath), { recursive: true });
        const cmd = this.buildShellCommand(config, exitMarkerPath);
        this.pendingSpawns++;
        const spawnPromise = this.spawnQueue.then(() => this.spawnAgentAsync(config.agentId, cmd, exitMarkerPath));
        this.spawnQueue = spawnPromise;
        await spawnPromise;
    }
    async spawnAgentAsync(agentId, cmd, exitMarkerPath) {
        try {
            let sessionId;
            if (this.sessions.size === 0) {
                // First agent: split from ITERM_SESSION_ID if present, else active session
                const leaderSessionId = process.env.ITERM_SESSION_ID || undefined;
                sessionId = await itermSplitPane(leaderSessionId);
                await itermRunCommand(sessionId, cmd);
            }
            else {
                // Subsequent agents: split from last agent session, else active session
                sessionId = await itermSplitPane(this.lastSplitSessionId || undefined);
                await itermRunCommand(sessionId, cmd);
            }
            const agentSession = {
                agentId,
                sessionId,
                exitMarkerPath,
                status: 'running',
                exitCode: 0
            };
            this.sessions.set(agentId, agentSession);
            this.agentOrder.push(agentId);
            this.lastSplitSessionId = sessionId;
            if (this.activeAgentId === null) {
                this.activeAgentId = agentId;
            }
            this.startExitPolling();
            debugLogger.info(`Spawned agent "${agentId}" in session ${sessionId}`);
        }
        catch (error) {
            debugLogger.error(`Failed to spawn agent "${agentId}":`, error);
            this.sessions.set(agentId, {
                agentId,
                sessionId: '',
                exitMarkerPath,
                status: 'exited',
                exitCode: 1
            });
            this.agentOrder.push(agentId);
            this.onExitCallback?.(agentId, 1, null);
        }
        finally {
            this.pendingSpawns--;
        }
    }
    stopAgent(agentId) {
        const session = this.sessions.get(agentId);
        if (!session || session.status !== 'running') {
            return;
        }
        itermCloseSession(session.sessionId).catch((e) => debugLogger.error(`Failed to close session for agent "${agentId}": ${e}`));
        session.status = 'exited';
        session.exitCode = 1;
        this.onExitCallback?.(agentId, 1, null);
        debugLogger.info(`Closed iTerm2 session for agent "${agentId}"`);
    }
    stopAll() {
        for (const session of this.sessions.values()) {
            if (session.status === 'running') {
                itermCloseSession(session.sessionId).catch((e) => debugLogger.error(`Failed to close session for agent "${session.agentId}": ${e}`));
                session.status = 'exited';
                session.exitCode = 1;
                this.onExitCallback?.(session.agentId, 1, null);
            }
        }
        this.activeAgentId = null;
    }
    async cleanup() {
        this.stopExitPolling();
        // Close all iTerm2 sessions we created
        for (const session of this.sessions.values()) {
            if (!session.sessionId) {
                continue;
            }
            try {
                await itermCloseSession(session.sessionId);
            }
            catch (error) {
                debugLogger.error('Session cleanup error (ignored):', error);
            }
        }
        // Clean up exit marker files
        try {
            await fs.rm(this.exitMarkerDir, {
                recursive: true,
                force: true
            });
        }
        catch (error) {
            debugLogger.error('Exit marker cleanup error (ignored):', error);
        }
        this.sessions.clear();
        this.agentOrder = [];
        this.activeAgentId = null;
        this.lastSplitSessionId = null;
    }
    setOnAgentExit(callback) {
        this.onExitCallback = callback;
    }
    async waitForAll(timeoutMs) {
        if (this.allExited()) {
            return true;
        }
        return new Promise((resolve) => {
            let timeoutHandle;
            const checkInterval = setInterval(() => {
                if (this.allExited()) {
                    clearInterval(checkInterval);
                    if (timeoutHandle) {
                        clearTimeout(timeoutHandle);
                    }
                    resolve(true);
                }
            }, EXIT_POLL_INTERVAL_MS);
            if (timeoutMs !== undefined) {
                timeoutHandle = setTimeout(() => {
                    clearInterval(checkInterval);
                    resolve(false);
                }, timeoutMs);
            }
        });
    }
    // ─── Active Agent & Navigation ──────────────────────────────
    switchTo(agentId) {
        if (!this.sessions.has(agentId)) {
            throw new Error(`Agent "${agentId}" not found.`);
        }
        const session = this.sessions.get(agentId);
        this.activeAgentId = agentId;
        itermFocusSession(session.sessionId).catch((e) => debugLogger.error(`Failed to focus session for agent "${agentId}": ${e}`));
    }
    switchToNext() {
        if (this.agentOrder.length <= 1) {
            return;
        }
        const currentIndex = this.agentOrder.indexOf(this.activeAgentId ?? '');
        const nextIndex = (currentIndex + 1) % this.agentOrder.length;
        this.switchTo(this.agentOrder[nextIndex]);
    }
    switchToPrevious() {
        if (this.agentOrder.length <= 1) {
            return;
        }
        const currentIndex = this.agentOrder.indexOf(this.activeAgentId ?? '');
        const prevIndex = (currentIndex - 1 + this.agentOrder.length) %
            this.agentOrder.length;
        this.switchTo(this.agentOrder[prevIndex]);
    }
    getActiveAgentId() {
        return this.activeAgentId;
    }
    // ─── Screen Capture ─────────────────────────────────────────
    getActiveSnapshot() {
        // iTerm2 manages rendering — snapshots not supported
        return null;
    }
    getAgentSnapshot(_agentId, _scrollOffset = 0) {
        return null;
    }
    getAgentScrollbackLength(_agentId) {
        return 0;
    }
    // ─── Input ──────────────────────────────────────────────────
    forwardInput(data) {
        if (!this.activeAgentId) {
            return false;
        }
        return this.writeToAgent(this.activeAgentId, data);
    }
    writeToAgent(agentId, data) {
        const session = this.sessions.get(agentId);
        if (!session || session.status !== 'running') {
            return false;
        }
        itermSendText(session.sessionId, data).catch((e) => debugLogger.error(`Failed to send text to agent "${agentId}": ${e}`));
        return true;
    }
    // ─── Resize ─────────────────────────────────────────────────
    resizeAll(_cols, _rows) {
        // iTerm2 manages pane sizes automatically
    }
    getAttachHint() {
        // iTerm2 panes are visible directly, no attach needed
        return null;
    }
    // ─── Private ────────────────────────────────────────────────
    /**
     * Build the shell command with exit marker wrapping.
     *
     * The command is wrapped so that its exit code is written to a temp file
     * when it completes. This allows the backend to detect agent exit via
     * file polling, since iTerm2 `write text` runs commands inside a shell
     * (the shell stays alive after the command exits).
     */
    buildShellCommand(config, exitMarkerPath) {
        const envParts = [];
        if (config.env) {
            for (const [key, value] of Object.entries(config.env)) {
                if (!VALID_ENV_KEY.test(key)) {
                    throw new Error(`Invalid environment variable name: "${key}". Names must match /^[A-Za-z_][A-Za-z0-9_]*$/.`);
                }
                envParts.push(`${key}=${shellQuote(value)}`);
            }
        }
        const cmdParts = [
            shellQuote(config.command),
            ...config.args.map(shellQuote)
        ];
        // Build: cd <cwd> && [env K=V] command args; echo $? > <marker>
        const parts = [`cd ${shellQuote(config.cwd)}`];
        if (envParts.length > 0) {
            parts.push(`env ${envParts.join(' ')} ${cmdParts.join(' ')}`);
        }
        else {
            parts.push(cmdParts.join(' '));
        }
        const mainCmd = parts.join(' && ');
        // Write exit code to a temp file first, then atomically rename it
        // to the marker path. This prevents the polling loop from reading
        // a partially-written file.
        const tmpMarker = shellQuote(`${exitMarkerPath}.tmp`);
        const finalMarker = shellQuote(exitMarkerPath);
        return `${mainCmd}; echo $? > ${tmpMarker} && mv ${tmpMarker} ${finalMarker}`;
    }
    allExited() {
        if (this.pendingSpawns > 0) {
            return false;
        }
        if (this.sessions.size === 0) {
            return true;
        }
        for (const session of this.sessions.values()) {
            if (session.status === 'running') {
                return false;
            }
        }
        return true;
    }
    startExitPolling() {
        if (this.exitPollTimer) {
            return;
        }
        this.exitPollTimer = setInterval(() => {
            void this.pollExitStatus();
        }, EXIT_POLL_INTERVAL_MS);
        this.exitPollTimer.unref();
    }
    stopExitPolling() {
        if (this.exitPollTimer) {
            clearInterval(this.exitPollTimer);
            this.exitPollTimer = null;
        }
    }
    async pollExitStatus() {
        for (const agent of this.sessions.values()) {
            if (agent.status !== 'running') {
                continue;
            }
            try {
                const content = await fs.readFile(agent.exitMarkerPath, 'utf8');
                const exitCode = parseInt(content.trim(), 10);
                agent.status = 'exited';
                agent.exitCode = Number.isNaN(exitCode) ? 1 : exitCode;
                debugLogger.info(`Agent "${agent.agentId}" exited with code ${agent.exitCode}`);
                this.onExitCallback?.(agent.agentId, agent.exitCode, null);
            }
            catch {
                // File doesn't exist yet — command still running
            }
        }
        if (this.allExited()) {
            this.stopExitPolling();
        }
    }
}
/** Regex for valid POSIX environment variable names */
const VALID_ENV_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;
/**
 * Simple shell quoting for building command strings.
 * Wraps value in single quotes, escaping any internal single quotes.
 */
function shellQuote(value) {
    return `'${value.replace(/'/g, "'\\''")}'`;
}
//# sourceMappingURL=ITermBackend.js.map