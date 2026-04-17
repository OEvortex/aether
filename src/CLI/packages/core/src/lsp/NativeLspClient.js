/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Adapter class that implements LspClient by delegating to NativeLspService.
 *
 * @example
 * ```typescript
 * const lspService = new NativeLspService(config, workspaceContext, ...);
 * await lspService.start();
 * const lspClient = new NativeLspClient(lspService);
 * config.setLspClient(lspClient);
 * ```
 */
export class NativeLspClient {
    service;
    /**
     * Creates a new NativeLspClient instance.
     *
     * @param service - The NativeLspService instance to delegate calls to
     */
    constructor(service) {
        this.service = service;
    }
    /**
     * Search for symbols across the workspace.
     *
     * @param query - The search query string
     * @param limit - Maximum number of results to return
     * @returns Promise resolving to array of symbol information
     */
    workspaceSymbols(query, limit) {
        return this.service.workspaceSymbols(query, limit);
    }
    /**
     * Find where a symbol is defined.
     *
     * @param location - The source location to find definitions for
     * @param serverName - Optional specific LSP server to query
     * @param limit - Maximum number of results to return
     * @returns Promise resolving to array of definition locations
     */
    definitions(location, serverName, limit) {
        return this.service.definitions(location, serverName, limit);
    }
    /**
     * Find all references to a symbol.
     *
     * @param location - The source location to find references for
     * @param serverName - Optional specific LSP server to query
     * @param includeDeclaration - Whether to include the declaration in results
     * @param limit - Maximum number of results to return
     * @returns Promise resolving to array of reference locations
     */
    references(location, serverName, includeDeclaration, limit) {
        return this.service.references(location, serverName, includeDeclaration, limit);
    }
    /**
     * Get hover information (documentation, type info) for a symbol.
     *
     * @param location - The source location to get hover info for
     * @param serverName - Optional specific LSP server to query
     * @returns Promise resolving to hover result or null if not available
     */
    hover(location, serverName) {
        return this.service.hover(location, serverName);
    }
    /**
     * Get all symbols in a document.
     *
     * @param uri - The document URI to get symbols for
     * @param serverName - Optional specific LSP server to query
     * @param limit - Maximum number of results to return
     * @returns Promise resolving to array of symbol information
     */
    documentSymbols(uri, serverName, limit) {
        return this.service.documentSymbols(uri, serverName, limit);
    }
    /**
     * Find implementations of an interface or abstract method.
     *
     * @param location - The source location to find implementations for
     * @param serverName - Optional specific LSP server to query
     * @param limit - Maximum number of results to return
     * @returns Promise resolving to array of implementation locations
     */
    implementations(location, serverName, limit) {
        return this.service.implementations(location, serverName, limit);
    }
    /**
     * Prepare call hierarchy item at a position (functions/methods).
     *
     * @param location - The source location to prepare call hierarchy for
     * @param serverName - Optional specific LSP server to query
     * @param limit - Maximum number of results to return
     * @returns Promise resolving to array of call hierarchy items
     */
    prepareCallHierarchy(location, serverName, limit) {
        return this.service.prepareCallHierarchy(location, serverName, limit);
    }
    /**
     * Find all functions/methods that call the given function.
     *
     * @param item - The call hierarchy item to find callers for
     * @param serverName - Optional specific LSP server to query
     * @param limit - Maximum number of results to return
     * @returns Promise resolving to array of incoming calls
     */
    incomingCalls(item, serverName, limit) {
        return this.service.incomingCalls(item, serverName, limit);
    }
    /**
     * Find all functions/methods called by the given function.
     *
     * @param item - The call hierarchy item to find callees for
     * @param serverName - Optional specific LSP server to query
     * @param limit - Maximum number of results to return
     * @returns Promise resolving to array of outgoing calls
     */
    outgoingCalls(item, serverName, limit) {
        return this.service.outgoingCalls(item, serverName, limit);
    }
    /**
     * Get diagnostics for a specific document.
     *
     * @param uri - The document URI to get diagnostics for
     * @param serverName - Optional specific LSP server to query
     * @returns Promise resolving to array of diagnostics
     */
    diagnostics(uri, serverName) {
        return this.service.diagnostics(uri, serverName);
    }
    /**
     * Get diagnostics for all open documents in the workspace.
     *
     * @param serverName - Optional specific LSP server to query
     * @param limit - Maximum number of file diagnostics to return
     * @returns Promise resolving to array of file diagnostics
     */
    workspaceDiagnostics(serverName, limit) {
        return this.service.workspaceDiagnostics(serverName, limit);
    }
    /**
     * Get code actions available at a specific location.
     *
     * @param uri - The document URI
     * @param range - The range to get code actions for
     * @param context - The code action context including diagnostics
     * @param serverName - Optional specific LSP server to query
     * @param limit - Maximum number of code actions to return
     * @returns Promise resolving to array of code actions
     */
    codeActions(uri, range, context, serverName, limit) {
        return this.service.codeActions(uri, range, context, serverName, limit);
    }
    /**
     * Apply a workspace edit (from code action or other sources).
     *
     * @param edit - The workspace edit to apply
     * @param serverName - Optional specific LSP server context
     * @returns Promise resolving to true if edit was applied successfully
     */
    applyWorkspaceEdit(edit, serverName) {
        return this.service.applyWorkspaceEdit(edit, serverName);
    }
}
//# sourceMappingURL=NativeLspClient.js.map