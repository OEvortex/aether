/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import type { AnsiOutput } from '../../utils/terminalSerializer.js';
import type { AgentExitCallback, AgentSpawnConfig, Backend } from './types.js';
export declare class TmuxBackend implements Backend {
    readonly type: "tmux";
    /** The pane ID where the main process runs (left side) */
    private mainPaneId;
    /** Window target (session:window) */
    private windowTarget;
    /** Whether we are running inside tmux */
    private insideTmux;
    /** External tmux server name (when outside tmux) */
    private serverName;
    /** External tmux session name (when outside tmux) */
    private sessionName;
    /** External tmux window name (when outside tmux) */
    private windowName;
    private panes;
    private agentOrder;
    private activeAgentId;
    private onExitCallback;
    private exitPollTimer;
    private initialized;
    /** Whether cleanup() has been called */
    private cleanedUp;
    /** Number of agents currently being spawned asynchronously */
    private pendingSpawns;
    /** Queue to serialize spawn operations (prevents race conditions) */
    private spawnQueue;
    init(): Promise<void>;
    spawnAgent(config: AgentSpawnConfig): Promise<void>;
    private spawnAgentAsync;
    /**
     * Trigger terminal redraw in main process after pane layout changes.
     * Uses multiple methods to ensure Ink picks up the new terminal size.
     */
    private triggerMainProcessRedraw;
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
    private resolveTmuxOptions;
    private getServerName;
    private ensureExternalSession;
    private spawnInsideTmux;
    private spawnOutsideTmux;
    private pickMiddlePane;
    private shouldSplitHorizontally;
    private applyPaneDecorations;
    private applyInsideLayout;
    private applyExternalLayout;
    private sleep;
    private buildShellCommand;
    private allExited;
    private startExitPolling;
    private stopExitPolling;
    private pollPaneStatus;
}
