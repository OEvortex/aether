/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview InProcessBackend — Backend implementation that runs agents
 * in the current process using AgentInteractive instead of PTY subprocesses.
 *
 * This enables Arena to work without tmux or any external terminal multiplexer.
 */
import type { Config } from '../../config/config.js';
import type { AnsiOutput } from '../../utils/terminalSerializer.js';
import { AgentInteractive } from '../runtime/agent-interactive.js';
import type { AgentExitCallback, AgentSpawnConfig, Backend } from './types.js';
/**
 * InProcessBackend runs agents in the current Node.js process.
 *
 * Instead of spawning PTY subprocesses, it creates AgentCore + AgentInteractive
 * instances that execute in-process. Screen capture returns null (the UI reads
 * messages directly from AgentInteractive).
 */
export declare class InProcessBackend implements Backend {
    readonly type: "in-process";
    private readonly runtimeContext;
    private readonly agents;
    private readonly agentRegistries;
    private readonly agentOrder;
    private activeAgentId;
    private exitCallback;
    /** Whether cleanup() has been called */
    private cleanedUp;
    constructor(runtimeContext: Config);
    init(): Promise<void>;
    spawnAgent(config: AgentSpawnConfig): Promise<void>;
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
     * Get an AgentInteractive instance by agent ID.
     * Used by ArenaManager for direct event subscription.
     */
    getAgent(agentId: string): AgentInteractive | undefined;
    private navigate;
}
