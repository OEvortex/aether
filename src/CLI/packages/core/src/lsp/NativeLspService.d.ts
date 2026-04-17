/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import type { EventEmitter } from 'node:events';
import type { Config as CoreConfig } from '../config/config.js';
import type { IdeContextStore } from '../ide/ideContext.js';
import type { FileDiscoveryService } from '../services/fileDiscoveryService.js';
import type { WorkspaceContext } from '../utils/workspaceContext.js';
import type { LspCallHierarchyIncomingCall, LspCallHierarchyItem, LspCallHierarchyOutgoingCall, LspCodeAction, LspCodeActionContext, LspDefinition, LspDiagnostic, LspFileDiagnostics, LspHoverResult, LspLocation, LspRange, LspReference, LspServerStatus, LspSymbolInformation, LspWorkspaceEdit, NativeLspServiceOptions } from './types.js';
export declare class NativeLspService {
    private config;
    private workspaceContext;
    private fileDiscoveryService;
    private requireTrustedWorkspace;
    private workspaceRoot;
    private configLoader;
    private serverManager;
    private normalizer;
    private openedDocuments;
    private lastConnections;
    constructor(config: CoreConfig, workspaceContext: WorkspaceContext, _eventEmitter: EventEmitter, fileDiscoveryService: FileDiscoveryService, _ideContextStore: IdeContextStore, options?: NativeLspServiceOptions);
    /**
     * Discover and prepare LSP servers
     */
    discoverAndPrepare(): Promise<void>;
    private getActiveExtensions;
    /**
     * Start all LSP servers
     */
    start(): Promise<void>;
    /**
     * Stop all LSP servers
     */
    stop(): Promise<void>;
    /**
     * Get LSP server status
     */
    getStatus(): Map<string, LspServerStatus>;
    /**
     * Get ready server handles filtered by optional server name.
     * Each handle is guaranteed to have a valid connection.
     *
     * @param serverName - Optional server name to filter by
     * @returns Array of [serverName, handle] tuples with active connections
     */
    private getReadyHandles;
    /**
     * Ensure a document is open on the given LSP server. Sends textDocument/didOpen
     * if not already tracked, then waits for the server to process the file before
     * returning. This delay prevents empty results when the server hasn't analyzed
     * the file yet.
     *
     * @param serverName - The name of the LSP server
     * @param handle - The server handle with an active connection
     * @param uri - The document URI to open
     * @returns true if a new didOpen was sent; false if already open or failed
     */
    private ensureDocumentOpen;
    /**
     * Register a URI that was opened externally (e.g. by warmupTypescriptServer)
     * so that ensureDocumentOpen does not send a duplicate textDocument/didOpen.
     *
     * @param serverName - The name of the LSP server
     * @param uri - The document URI to track as already opened
     */
    private trackExternallyOpenedDocument;
    private resolveLanguageId;
    private warmupWorkspaceSymbols;
    /**
     * Find the first source file in the workspace that matches the server's
     * language extensions. Used to open a file for workspace symbol warmup.
     *
     * @param handle - The LSP server handle to determine target extensions
     * @returns Absolute path of the first matching file, or undefined
     */
    private findWorkspaceFileForServer;
    /**
     * Determine file extensions this server can handle, used to find a workspace
     * file to open for warmup. Resolution order:
     *   1. Keys from config.extensionToLanguage (explicit user/extension mapping)
     *   2. Derived from config.languages via LANGUAGE_ID_TO_EXTENSIONS, falling
     *      back to treating the language ID itself as a file extension
     */
    private getWorkspaceSymbolExtensions;
    /**
     * Run TypeScript server warmup and track the opened URI to prevent
     * duplicate didOpen notifications.
     *
     * @param serverName - The name of the LSP server
     * @param handle - The server handle
     * @param force - Force re-warmup even if already warmed up
     */
    private warmupAndTrack;
    /**
     * Whether we should retry a document-level operation that returned empty
     * results. We retry when a textDocument/didOpen was just sent (the server
     * may still be indexing) AND the server is not a fast TypeScript server.
     */
    private shouldRetryAfterOpen;
    private delay;
    /**
     * Workspace symbol search across all ready LSP servers.
     */
    workspaceSymbols(query: string, limit?: number): Promise<LspSymbolInformation[]>;
    /**
     * Go to definition
     */
    definitions(location: LspLocation, serverName?: string, limit?: number): Promise<LspDefinition[]>;
    /**
     * Find references
     */
    references(location: LspLocation, serverName?: string, includeDeclaration?: boolean, limit?: number): Promise<LspReference[]>;
    /**
     * Get hover information
     */
    hover(location: LspLocation, serverName?: string): Promise<LspHoverResult | null>;
    /**
     * Get document symbols
     */
    documentSymbols(uri: string, serverName?: string, limit?: number): Promise<LspSymbolInformation[]>;
    /**
     * Find implementations
     */
    implementations(location: LspLocation, serverName?: string, limit?: number): Promise<LspDefinition[]>;
    /**
     * Prepare call hierarchy
     */
    prepareCallHierarchy(location: LspLocation, serverName?: string, limit?: number): Promise<LspCallHierarchyItem[]>;
    /**
     * Find callers of the current function
     */
    incomingCalls(item: LspCallHierarchyItem, serverName?: string, limit?: number): Promise<LspCallHierarchyIncomingCall[]>;
    /**
     * Find functions called by the current function
     */
    outgoingCalls(item: LspCallHierarchyItem, serverName?: string, limit?: number): Promise<LspCallHierarchyOutgoingCall[]>;
    /**
     * Get diagnostics for a document
     */
    diagnostics(uri: string, serverName?: string): Promise<LspDiagnostic[]>;
    /**
     * Get diagnostics for all documents in the workspace
     */
    workspaceDiagnostics(serverName?: string, limit?: number): Promise<LspFileDiagnostics[]>;
    /**
     * Get code actions at the specified position
     */
    codeActions(uri: string, range: LspRange, context: LspCodeActionContext, serverName?: string, limit?: number): Promise<LspCodeAction[]>;
    /**
     * Apply workspace edit
     */
    applyWorkspaceEdit(edit: LspWorkspaceEdit, _serverName?: string): Promise<boolean>;
    /**
     * Apply text edits to a file
     */
    private applyTextEdits;
    /**
     * Check if an LSP response represents an empty/null result, used to decide
     * whether a retry is worthwhile after a freshly opened document.
     */
    private isEmptyResponse;
    private isNoProjectErrorResponse;
}
