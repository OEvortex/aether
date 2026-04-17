/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import { createContentGenerator } from '../../core/contentGenerator.js';
import { buildAgentContentGeneratorConfig } from '../../models/content-generator-config.js';
import { FileDiscoveryService } from '../../services/fileDiscoveryService.js';
import { createDebugLogger } from '../../utils/debugLogger.js';
import { WorkspaceContext } from '../../utils/workspaceContext.js';
import { AgentCore } from '../runtime/agent-core.js';
import { AgentEventEmitter } from '../runtime/agent-events.js';
import { ContextState } from '../runtime/agent-headless.js';
import { AgentInteractive } from '../runtime/agent-interactive.js';
import { AgentStatus, isTerminalStatus } from '../runtime/agent-types.js';
import { DISPLAY_MODE } from './types.js';
const debugLogger = createDebugLogger('IN_PROCESS_BACKEND');
/**
 * InProcessBackend runs agents in the current Node.js process.
 *
 * Instead of spawning PTY subprocesses, it creates AgentCore + AgentInteractive
 * instances that execute in-process. Screen capture returns null (the UI reads
 * messages directly from AgentInteractive).
 */
export class InProcessBackend {
    type = DISPLAY_MODE.IN_PROCESS;
    runtimeContext;
    agents = new Map();
    agentRegistries = [];
    agentOrder = [];
    activeAgentId = null;
    exitCallback = null;
    /** Whether cleanup() has been called */
    cleanedUp = false;
    constructor(runtimeContext) {
        this.runtimeContext = runtimeContext;
    }
    // ─── Backend Interface ─────────────────────────────────────
    async init() {
        debugLogger.info('InProcessBackend initialized');
    }
    async spawnAgent(config) {
        const inProcessConfig = config.inProcess;
        if (!inProcessConfig) {
            throw new Error(`InProcessBackend requires inProcess config for agent ${config.agentId}`);
        }
        if (this.agents.has(config.agentId)) {
            throw new Error(`Agent "${config.agentId}" already exists.`);
        }
        const { promptConfig, modelConfig, runConfig, toolConfig } = inProcessConfig.runtimeConfig;
        const eventEmitter = new AgentEventEmitter();
        // Build a per-agent runtime context with isolated working directory,
        // target directory, workspace context, tool registry, and (optionally)
        // a dedicated ContentGenerator for per-agent auth isolation.
        const agentContext = await createPerAgentConfig(this.runtimeContext, config.cwd, inProcessConfig.runtimeConfig.modelConfig.model, inProcessConfig.authOverrides);
        this.agentRegistries.push(agentContext.getToolRegistry());
        const core = new AgentCore(inProcessConfig.agentName, agentContext, promptConfig, modelConfig, runConfig, toolConfig, eventEmitter);
        const interactive = new AgentInteractive({
            agentId: config.agentId,
            agentName: inProcessConfig.agentName,
            initialTask: inProcessConfig.initialTask,
            maxTurnsPerMessage: runConfig.max_turns,
            maxTimeMinutesPerMessage: runConfig.max_time_minutes,
            chatHistory: inProcessConfig.chatHistory
        }, core);
        this.agents.set(config.agentId, interactive);
        this.agentOrder.push(config.agentId);
        // Set first agent as active
        if (this.activeAgentId === null) {
            this.activeAgentId = config.agentId;
        }
        try {
            const context = new ContextState();
            await interactive.start(context);
            // Watch for completion and fire exit callback — but only for
            // truly terminal statuses. IDLE means the agent is still alive
            // and can accept follow-up messages.
            void interactive.waitForCompletion().then(() => {
                const status = interactive.getStatus();
                if (!isTerminalStatus(status)) {
                    return;
                }
                const exitCode = status === AgentStatus.COMPLETED
                    ? 0
                    : status === AgentStatus.FAILED
                        ? 1
                        : null;
                this.exitCallback?.(config.agentId, exitCode, null);
            });
            debugLogger.info(`Spawned in-process agent: ${config.agentId}`);
        }
        catch (error) {
            debugLogger.error(`Failed to start in-process agent "${config.agentId}":`, error);
            this.exitCallback?.(config.agentId, 1, null);
        }
    }
    stopAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (agent) {
            agent.abort();
            debugLogger.info(`Stopped agent: ${agentId}`);
        }
    }
    stopAll() {
        for (const agent of this.agents.values()) {
            agent.abort();
        }
        debugLogger.info('Stopped all in-process agents');
    }
    async cleanup() {
        this.cleanedUp = true;
        for (const agent of this.agents.values()) {
            agent.abort();
        }
        // Wait for loops to settle, but cap at 3s so CLI exit isn't blocked
        // if an agent's reasoning loop doesn't terminate promptly after abort.
        const CLEANUP_TIMEOUT_MS = 3000;
        const promises = Array.from(this.agents.values()).map((a) => a.waitForCompletion().catch(() => { }));
        let timerId;
        const timeout = new Promise((resolve) => {
            timerId = setTimeout(resolve, CLEANUP_TIMEOUT_MS);
        });
        await Promise.race([Promise.allSettled(promises), timeout]);
        clearTimeout(timerId);
        // Stop per-agent tool registries so tools like AgentTool can release
        // listeners registered on shared managers (e.g. SubagentManager).
        for (const registry of this.agentRegistries) {
            await registry.stop().catch(() => { });
        }
        this.agentRegistries.length = 0;
        this.agents.clear();
        this.agentOrder.length = 0;
        this.activeAgentId = null;
        debugLogger.info('InProcessBackend cleaned up');
    }
    setOnAgentExit(callback) {
        this.exitCallback = callback;
    }
    async waitForAll(timeoutMs) {
        if (this.cleanedUp) {
            return true;
        }
        const promises = Array.from(this.agents.values()).map((a) => a.waitForCompletion());
        if (timeoutMs === undefined) {
            await Promise.allSettled(promises);
            return true;
        }
        let timerId;
        const timeout = new Promise((resolve) => {
            timerId = setTimeout(() => resolve('timeout'), timeoutMs);
        });
        const result = await Promise.race([
            Promise.allSettled(promises).then(() => 'done'),
            timeout
        ]);
        clearTimeout(timerId);
        return result === 'done';
    }
    // ─── Navigation ────────────────────────────────────────────
    switchTo(agentId) {
        if (this.agents.has(agentId)) {
            this.activeAgentId = agentId;
        }
    }
    switchToNext() {
        this.activeAgentId = this.navigate(1);
    }
    switchToPrevious() {
        this.activeAgentId = this.navigate(-1);
    }
    getActiveAgentId() {
        return this.activeAgentId;
    }
    // ─── Screen Capture (no-op for in-process) ─────────────────
    getActiveSnapshot() {
        return null;
    }
    getAgentSnapshot(_agentId, _scrollOffset) {
        return null;
    }
    getAgentScrollbackLength(_agentId) {
        return 0;
    }
    // ─── Input ─────────────────────────────────────────────────
    forwardInput(data) {
        if (!this.activeAgentId) {
            return false;
        }
        return this.writeToAgent(this.activeAgentId, data);
    }
    writeToAgent(agentId, data) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            return false;
        }
        agent.enqueueMessage(data);
        return true;
    }
    // ─── Resize (no-op) ───────────────────────────────────────
    resizeAll(_cols, _rows) {
        // No terminals to resize in-process
    }
    // ─── External Session ──────────────────────────────────────
    getAttachHint() {
        return null;
    }
    // ─── Extra: Direct Access ──────────────────────────────────
    /**
     * Get an AgentInteractive instance by agent ID.
     * Used by ArenaManager for direct event subscription.
     */
    getAgent(agentId) {
        return this.agents.get(agentId);
    }
    // ─── Private ───────────────────────────────────────────────
    navigate(direction) {
        if (this.agentOrder.length === 0) {
            return null;
        }
        if (!this.activeAgentId) {
            return this.agentOrder[0] ?? null;
        }
        const currentIndex = this.agentOrder.indexOf(this.activeAgentId);
        if (currentIndex === -1) {
            return this.agentOrder[0] ?? null;
        }
        const nextIndex = (currentIndex + direction + this.agentOrder.length) %
            this.agentOrder.length;
        return this.agentOrder[nextIndex] ?? null;
    }
}
/**
 * Create a per-agent Config that delegates to the shared base Config but
 * overrides key methods to provide per-agent isolation:
 *
 * - `getWorkingDir()` / `getTargetDir()` → agent's worktree cwd
 * - `getWorkspaceContext()` → WorkspaceContext rooted at agent's cwd
 * - `getFileService()` → FileDiscoveryService rooted at agent's cwd
 * - `getToolRegistry()` → per-agent tool registry with core tools bound to
 *   the agent Config
 * - `getContentGenerator()` / `getContentGeneratorConfig()` / `getAuthType()`
 *   → per-agent ContentGenerator when `authOverrides` is provided
 */
async function createPerAgentConfig(base, cwd, modelId, authOverrides) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const override = Object.create(base);
    override.getWorkingDir = () => cwd;
    override.getTargetDir = () => cwd;
    override.getProjectRoot = () => cwd;
    const agentWorkspace = new WorkspaceContext(cwd);
    override.getWorkspaceContext = () => agentWorkspace;
    const agentFileService = new FileDiscoveryService(cwd);
    override.getFileService = () => agentFileService;
    const agentRegistry = await override.createToolRegistry(undefined, { skipDiscovery: true });
    agentRegistry.copyDiscoveredToolsFrom(base.getToolRegistry());
    override.getToolRegistry = () => agentRegistry;
    if (authOverrides?.authType) {
        try {
            const agentGeneratorConfig = buildAgentContentGeneratorConfig(base, modelId, authOverrides);
            const agentGenerator = await createContentGenerator(agentGeneratorConfig, override);
            override.getContentGenerator = () => agentGenerator;
            override.getContentGeneratorConfig = () => agentGeneratorConfig;
            override.getAuthType = () => agentGeneratorConfig.authType;
            override.getModel = () => agentGeneratorConfig.model;
            debugLogger.info(`Created per-agent ContentGenerator: authType=${authOverrides.authType}, model=${agentGeneratorConfig.model}`);
        }
        catch (error) {
            debugLogger.error('Failed to create per-agent ContentGenerator, falling back to parent:', error);
        }
    }
    return override;
}
//# sourceMappingURL=InProcessBackend.js.map