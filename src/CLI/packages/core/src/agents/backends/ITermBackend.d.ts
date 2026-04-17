/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import type { AnsiOutput } from '../../utils/terminalSerializer.js';
import type { AgentExitCallback, AgentSpawnConfig, Backend } from './types.js';
export declare class ITermBackend implements Backend {
    readonly type: "iterm2";
    /** Directory for exit marker files */
    private exitMarkerDir;
    /** Session ID of the last agent pane (split source) */
    private lastSplitSessionId;
    private sessions;
    private agentOrder;
    private activeAgentId;
    private onExitCallback;
    private exitPollTimer;
    private initialized;
    /** Number of agents currently being spawned asynchronously */
    private pendingSpawns;
    /** Queue to serialize spawn operations (prevents split race conditions) */
    private spawnQueue;
    constructor();
    init(): Promise<void>;
    spawnAgent(config: AgentSpawnConfig): Promise<void>;
    private spawnAgentAsync;
    stopAgent(agentId: string): void;
    stopAll(): void;
    cleanup(): Promise<void>;
    setOnAgentExit(callback: AgentExitCallback): void;
    waitForAll(timeoutMs?: number): Promise<boolean>;
    switchTo(agentId: string): void;
    switchToNext(): void;
    switchToPrevious(): void;
    getActiveAgentId(): string | null;
    getActiveSnapshot(): AnsiOutput | null;
    getAgentSnapshot(_agentId: string, _scrollOffset?: number): AnsiOutput | null;
    getAgentScrollbackLength(_agentId: string): number;
    forwardInput(data: string): boolean;
    writeToAgent(agentId: string, data: string): boolean;
    resizeAll(_cols: number, _rows: number): void;
    getAttachHint(): string | null;
    /**
     * Build the shell command with exit marker wrapping.
     *
     * The command is wrapped so that its exit code is written to a temp file
     * when it completes. This allows the backend to detect agent exit via
     * file polling, since iTerm2 `write text` runs commands inside a shell
     * (the shell stays alive after the command exits).
     */
    private buildShellCommand;
    private allExited;
    private startExitPolling;
    private stopExitPolling;
    private pollExitStatus;
}
