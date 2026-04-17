/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import type { LspCallHierarchyIncomingCall, LspCallHierarchyItem, LspCallHierarchyOutgoingCall, LspCodeAction, LspDiagnostic, LspFileDiagnostics, LspHoverResult, LspLocation, LspRange, LspReference, LspSymbolInformation, LspTextEdit, LspWorkspaceEdit } from './types.js';
/**
 * Normalizes LSP protocol responses to internal types.
 */
export declare class LspResponseNormalizer {
    /**
     * Normalize diagnostic result from LSP response
     */
    normalizeDiagnostic(item: unknown, serverName: string): LspDiagnostic | null;
    /**
     * Convert diagnostic back to LSP format for requests
     */
    denormalizeDiagnostic(diagnostic: LspDiagnostic): Record<string, unknown>;
    /**
     * Normalize diagnostic tags
     */
    normalizeDiagnosticTags(tags: unknown): Array<'unnecessary' | 'deprecated'>;
    /**
     * Normalize diagnostic related information
     */
    normalizeDiagnosticRelatedInfo(info: unknown): Array<{
        location: LspLocation;
        message: string;
    }>;
    /**
     * Normalize file diagnostics result
     */
    normalizeFileDiagnostics(item: unknown, serverName: string): LspFileDiagnostics | null;
    /**
     * Normalize code action result
     */
    normalizeCodeAction(item: unknown, serverName: string): LspCodeAction | null;
    /**
     * Normalize workspace edit
     */
    normalizeWorkspaceEdit(edit: unknown): LspWorkspaceEdit | null;
    /**
     * Normalize text edit
     */
    normalizeTextEdit(edit: unknown): LspTextEdit | null;
    /**
     * Normalize text document edit
     */
    normalizeTextDocumentEdit(docEdit: unknown): {
        textDocument: {
            uri: string;
            version?: number | null;
        };
        edits: LspTextEdit[];
    } | null;
    /**
     * Normalize command
     */
    normalizeCommand(cmd: unknown): {
        title: string;
        command: string;
        arguments?: unknown[];
    } | null;
    /**
     * Normalize location result (definitions, references, implementations)
     */
    normalizeLocationResult(item: unknown, serverName: string): LspReference | null;
    /**
     * Normalize symbol result (workspace symbols, document symbols)
     */
    normalizeSymbolResult(item: unknown, serverName: string): LspSymbolInformation | null;
    /**
     * Normalize a single range
     */
    normalizeRange(range: unknown): LspRange | null;
    /**
     * Normalize an array of ranges
     */
    normalizeRanges(ranges: unknown): LspRange[];
    /**
     * Normalize symbol kind from number to string label
     */
    normalizeSymbolKind(kind: unknown): string | undefined;
    /**
     * Normalize hover contents to string
     */
    normalizeHoverContents(contents: unknown): string;
    /**
     * Normalize hover result
     */
    normalizeHoverResult(response: unknown, serverName: string): LspHoverResult | null;
    /**
     * Normalize call hierarchy item
     */
    normalizeCallHierarchyItem(item: unknown, serverName: string): LspCallHierarchyItem | null;
    /**
     * Normalize incoming call
     */
    normalizeIncomingCall(item: unknown, serverName: string): LspCallHierarchyIncomingCall | null;
    /**
     * Normalize outgoing call
     */
    normalizeOutgoingCall(item: unknown, serverName: string): LspCallHierarchyOutgoingCall | null;
    /**
     * Convert call hierarchy item back to LSP params format
     */
    toCallHierarchyItemParams(item: LspCallHierarchyItem): Record<string, unknown>;
    /**
     * Check if item is a DocumentSymbol (has range and selectionRange)
     */
    isDocumentSymbol(item: Record<string, unknown>): boolean;
    /**
     * Recursively collect document symbols from a tree structure
     */
    collectDocumentSymbol(item: Record<string, unknown>, uri: string, serverName: string, results: LspSymbolInformation[], limit: number, containerName?: string): void;
}
