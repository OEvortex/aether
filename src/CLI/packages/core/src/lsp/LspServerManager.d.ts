/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config as CoreConfig } from '../config/config.js';
import type { FileDiscoveryService } from '../services/fileDiscoveryService.js';
import type { WorkspaceContext } from '../utils/workspaceContext.js';
import type { LspServerConfig, LspServerHandle, LspServerStatus } from './types.js';
export interface LspServerManagerOptions {
    requireTrustedWorkspace: boolean;
    workspaceRoot: string;
}
export declare class LspServerManager {
    private readonly config;
    private readonly workspaceContext;
    private readonly fileDiscoveryService;
    private serverHandles;
    private requireTrustedWorkspace;
    private workspaceRoot;
    constructor(config: CoreConfig, workspaceContext: WorkspaceContext, fileDiscoveryService: FileDiscoveryService, options: LspServerManagerOptions);
    setServerConfigs(configs: LspServerConfig[]): void;
    clearServerHandles(): void;
    getHandles(): ReadonlyMap<string, LspServerHandle>;
    getStatus(): Map<string, LspServerStatus>;
    startAll(): Promise<void>;
    stopAll(): Promise<void>;
    /**
     * Ensure tsserver has at least one file open so navto/navtree requests succeed.
     * Sets warmedUp flag only after successful warm-up to allow retry on failure.
     *
     * @param handle - The LSP server handle
     * @param force - Force re-warmup even if already warmed up
     * @returns The URI of the file opened during warmup, or undefined if no file was opened
     */
    warmupTypescriptServer(handle: LspServerHandle, force?: boolean): Promise<string | undefined>;
    /**
     * Check if the given handle is a TypeScript language server.
     *
     * @param handle - The LSP server handle
     * @returns true if it's a TypeScript server
     */
    isTypescriptServer(handle: LspServerHandle): boolean;
    /**
     * Start individual LSP server with lock to prevent concurrent startup attempts.
     *
     * @param name - The name of the LSP server
     * @param handle - The LSP server handle
     */
    private startServer;
    /**
     * Internal method that performs the actual server startup.
     *
     * @param name - The name of the LSP server
     * @param handle - The LSP server handle
     */
    private doStartServer;
    /**
     * Stop individual LSP server
     */
    private stopServer;
    private shutdownConnection;
    private attachRestartHandler;
    private resetHandle;
    private buildProcessEnv;
    private connectSocketWithRetry;
    /**
     * Create LSP connection
     */
    private createLspConnection;
    /**
     * Initialize LSP server
     */
    private initializeLspServer;
    /**
     * Check if command exists by spawning it with --version.
     * Only returns false when the spawn itself fails (e.g. ENOENT).
     * A timeout means the process started successfully (command exists)
     * but didn't exit in time — common for servers like jdtls that
     * don't support --version and start their full runtime instead.
     *
     * @param command - The command to check
     * @param env - Optional environment variables
     * @param cwd - Optional working directory
     * @returns true if the command can be spawned, false if not found
     */
    private commandExists;
    /**
     * Check path safety
     */
    private isPathSafe;
    /**
     * 请求用户确认启动 LSP 服务器
     */
    private requestUserConsent;
    /**
     * Find a representative TypeScript/JavaScript file to warm up tsserver.
     */
    private findFirstTypescriptFile;
}
