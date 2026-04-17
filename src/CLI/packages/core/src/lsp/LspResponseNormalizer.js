/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * LSP Response Normalizer
 *
 * Converts raw LSP protocol responses to normalized internal types.
 * Handles various response formats from different language servers.
 */
import { CODE_ACTION_KIND_LABELS, DIAGNOSTIC_SEVERITY_LABELS, SYMBOL_KIND_LABELS } from './constants.js';
/**
 * Normalizes LSP protocol responses to internal types.
 */
export class LspResponseNormalizer {
    // ============================================================================
    // Diagnostic Normalization
    // ============================================================================
    /**
     * Normalize diagnostic result from LSP response
     */
    normalizeDiagnostic(item, serverName) {
        if (!item || typeof item !== 'object') {
            return null;
        }
        const itemObj = item;
        const range = this.normalizeRange(itemObj.range);
        if (!range) {
            return null;
        }
        const message = typeof itemObj.message === 'string'
            ? itemObj.message
            : '';
        if (!message) {
            return null;
        }
        const severityNum = typeof itemObj.severity === 'number'
            ? itemObj.severity
            : undefined;
        const severity = severityNum
            ? DIAGNOSTIC_SEVERITY_LABELS[severityNum]
            : undefined;
        const code = itemObj.code;
        const codeValue = typeof code === 'string' || typeof code === 'number'
            ? code
            : undefined;
        const source = typeof itemObj.source === 'string'
            ? itemObj.source
            : undefined;
        const tags = this.normalizeDiagnosticTags(itemObj.tags);
        const relatedInfo = this.normalizeDiagnosticRelatedInfo(itemObj.relatedInformation);
        return {
            range,
            severity,
            code: codeValue,
            source,
            message,
            tags: tags.length > 0 ? tags : undefined,
            relatedInformation: relatedInfo.length > 0 ? relatedInfo : undefined,
            serverName
        };
    }
    /**
     * Convert diagnostic back to LSP format for requests
     */
    denormalizeDiagnostic(diagnostic) {
        const severityMap = {
            error: 1,
            warning: 2,
            information: 3,
            hint: 4
        };
        return {
            range: diagnostic.range,
            message: diagnostic.message,
            severity: diagnostic.severity
                ? severityMap[diagnostic.severity]
                : undefined,
            code: diagnostic.code,
            source: diagnostic.source
        };
    }
    /**
     * Normalize diagnostic tags
     */
    normalizeDiagnosticTags(tags) {
        if (!Array.isArray(tags)) {
            return [];
        }
        const result = [];
        for (const tag of tags) {
            if (tag === 1) {
                result.push('unnecessary');
            }
            else if (tag === 2) {
                result.push('deprecated');
            }
        }
        return result;
    }
    /**
     * Normalize diagnostic related information
     */
    normalizeDiagnosticRelatedInfo(info) {
        if (!Array.isArray(info)) {
            return [];
        }
        const result = [];
        for (const item of info) {
            if (!item || typeof item !== 'object') {
                continue;
            }
            const itemObj = item;
            const location = itemObj.location;
            if (!location || typeof location !== 'object') {
                continue;
            }
            const locObj = location;
            const uri = locObj.uri;
            const range = this.normalizeRange(locObj.range);
            const message = itemObj.message;
            if (typeof uri === 'string' &&
                range &&
                typeof message === 'string') {
                result.push({
                    location: { uri, range },
                    message
                });
            }
        }
        return result;
    }
    /**
     * Normalize file diagnostics result
     */
    normalizeFileDiagnostics(item, serverName) {
        if (!item || typeof item !== 'object') {
            return null;
        }
        const itemObj = item;
        const uri = typeof itemObj.uri === 'string' ? itemObj.uri : '';
        if (!uri) {
            return null;
        }
        const items = itemObj.items;
        if (!Array.isArray(items)) {
            return null;
        }
        const diagnostics = [];
        for (const diagItem of items) {
            const normalized = this.normalizeDiagnostic(diagItem, serverName);
            if (normalized) {
                diagnostics.push(normalized);
            }
        }
        return {
            uri,
            diagnostics,
            serverName
        };
    }
    // ============================================================================
    // Code Action Normalization
    // ============================================================================
    /**
     * Normalize code action result
     */
    normalizeCodeAction(item, serverName) {
        if (!item || typeof item !== 'object') {
            return null;
        }
        const itemObj = item;
        // Check if this is a Command instead of CodeAction
        if (itemObj.command &&
            typeof itemObj.title === 'string' &&
            !itemObj.kind) {
            // This is a raw Command, wrap it
            return {
                title: itemObj.title,
                command: {
                    title: itemObj.title,
                    command: itemObj.command ?? '',
                    arguments: itemObj.arguments
                },
                serverName
            };
        }
        const title = typeof itemObj.title === 'string' ? itemObj.title : '';
        if (!title) {
            return null;
        }
        const kind = typeof itemObj.kind === 'string'
            ? (CODE_ACTION_KIND_LABELS[itemObj.kind] ??
                itemObj.kind)
            : undefined;
        const isPreferred = typeof itemObj.isPreferred === 'boolean'
            ? itemObj.isPreferred
            : undefined;
        const edit = this.normalizeWorkspaceEdit(itemObj.edit);
        const command = this.normalizeCommand(itemObj.command);
        const diagnostics = [];
        if (Array.isArray(itemObj.diagnostics)) {
            for (const diag of itemObj.diagnostics) {
                const normalized = this.normalizeDiagnostic(diag, serverName);
                if (normalized) {
                    diagnostics.push(normalized);
                }
            }
        }
        return {
            title,
            kind,
            diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
            isPreferred,
            edit: edit ?? undefined,
            command: command ?? undefined,
            data: itemObj.data,
            serverName
        };
    }
    // ============================================================================
    // Workspace Edit Normalization
    // ============================================================================
    /**
     * Normalize workspace edit
     */
    normalizeWorkspaceEdit(edit) {
        if (!edit || typeof edit !== 'object') {
            return null;
        }
        const editObj = edit;
        const result = {};
        // Handle changes (map of URI to TextEdit[])
        if (editObj.changes && typeof editObj.changes === 'object') {
            const changes = editObj.changes;
            result.changes = {};
            for (const [uri, edits] of Object.entries(changes)) {
                if (Array.isArray(edits)) {
                    const normalizedEdits = [];
                    for (const e of edits) {
                        const normalized = this.normalizeTextEdit(e);
                        if (normalized) {
                            normalizedEdits.push(normalized);
                        }
                    }
                    if (normalizedEdits.length > 0) {
                        result.changes[uri] = normalizedEdits;
                    }
                }
            }
        }
        // Handle documentChanges
        if (Array.isArray(editObj.documentChanges)) {
            result.documentChanges = [];
            for (const docChange of editObj.documentChanges) {
                const normalized = this.normalizeTextDocumentEdit(docChange);
                if (normalized) {
                    result.documentChanges.push(normalized);
                }
            }
        }
        if ((!result.changes || Object.keys(result.changes).length === 0) &&
            (!result.documentChanges || result.documentChanges.length === 0)) {
            return null;
        }
        return result;
    }
    /**
     * Normalize text edit
     */
    normalizeTextEdit(edit) {
        if (!edit || typeof edit !== 'object') {
            return null;
        }
        const editObj = edit;
        const range = this.normalizeRange(editObj.range);
        if (!range) {
            return null;
        }
        const newText = typeof editObj.newText === 'string'
            ? editObj.newText
            : '';
        return { range, newText };
    }
    /**
     * Normalize text document edit
     */
    normalizeTextDocumentEdit(docEdit) {
        if (!docEdit || typeof docEdit !== 'object') {
            return null;
        }
        const docEditObj = docEdit;
        const textDocument = docEditObj.textDocument;
        if (!textDocument || typeof textDocument !== 'object') {
            return null;
        }
        const textDocObj = textDocument;
        const uri = typeof textDocObj.uri === 'string'
            ? textDocObj.uri
            : '';
        if (!uri) {
            return null;
        }
        const version = typeof textDocObj.version === 'number'
            ? textDocObj.version
            : null;
        const edits = docEditObj.edits;
        if (!Array.isArray(edits)) {
            return null;
        }
        const normalizedEdits = [];
        for (const e of edits) {
            const normalized = this.normalizeTextEdit(e);
            if (normalized) {
                normalizedEdits.push(normalized);
            }
        }
        if (normalizedEdits.length === 0) {
            return null;
        }
        return {
            textDocument: { uri, version },
            edits: normalizedEdits
        };
    }
    /**
     * Normalize command
     */
    normalizeCommand(cmd) {
        if (!cmd || typeof cmd !== 'object') {
            return null;
        }
        const cmdObj = cmd;
        const title = typeof cmdObj.title === 'string' ? cmdObj.title : '';
        const command = typeof cmdObj.command === 'string'
            ? cmdObj.command
            : '';
        if (!command) {
            return null;
        }
        const args = Array.isArray(cmdObj.arguments)
            ? cmdObj.arguments
            : undefined;
        return { title, command, arguments: args };
    }
    // ============================================================================
    // Location and Symbol Normalization
    // ============================================================================
    /**
     * Normalize location result (definitions, references, implementations)
     */
    normalizeLocationResult(item, serverName) {
        if (!item || typeof item !== 'object') {
            return null;
        }
        const itemObj = item;
        const uri = (itemObj.uri ??
            itemObj.targetUri ??
            itemObj.target?.uri);
        const range = (itemObj.range ??
            itemObj.targetSelectionRange ??
            itemObj.targetRange ??
            itemObj.target?.range);
        if (!uri || !range?.start || !range?.end) {
            return null;
        }
        const start = range.start;
        const end = range.end;
        return {
            uri,
            range: {
                start: {
                    line: Number(start?.line ?? 0),
                    character: Number(start?.character ?? 0)
                },
                end: {
                    line: Number(end?.line ?? 0),
                    character: Number(end?.character ?? 0)
                }
            },
            serverName
        };
    }
    /**
     * Normalize symbol result (workspace symbols, document symbols)
     */
    normalizeSymbolResult(item, serverName) {
        if (!item || typeof item !== 'object') {
            return null;
        }
        const itemObj = item;
        const location = itemObj.location ?? itemObj.target ?? item;
        if (!location || typeof location !== 'object') {
            return null;
        }
        const locationObj = location;
        const range = (locationObj.range ??
            locationObj.targetRange ??
            itemObj.range ??
            undefined);
        // Only require uri; range is optional per LSP 3.17 WorkspaceSymbol spec
        // where location may be { uri } without a range.
        if (!locationObj.uri) {
            return null;
        }
        // LSP 3.17 WorkspaceSymbol format may have location with only uri (no range).
        // Servers like jdtls use this format, requiring a workspaceSymbol/resolve call
        // for the full range. Default to file start when range is absent.
        const start = range?.start ?? { line: 0, character: 0 };
        const end = range?.end ?? { line: 0, character: 0 };
        return {
            name: (itemObj.name ?? itemObj.label ?? 'symbol'),
            kind: this.normalizeSymbolKind(itemObj.kind),
            containerName: (itemObj.containerName ?? itemObj.container),
            location: {
                uri: locationObj.uri,
                range: {
                    start: {
                        line: Number(start?.line ?? 0),
                        character: Number(start?.character ?? 0)
                    },
                    end: {
                        line: Number(end?.line ?? 0),
                        character: Number(end?.character ?? 0)
                    }
                }
            },
            serverName
        };
    }
    // ============================================================================
    // Range Normalization
    // ============================================================================
    /**
     * Normalize a single range
     */
    normalizeRange(range) {
        if (!range || typeof range !== 'object') {
            return null;
        }
        const rangeObj = range;
        const start = rangeObj.start;
        const end = rangeObj.end;
        if (!start ||
            typeof start !== 'object' ||
            !end ||
            typeof end !== 'object') {
            return null;
        }
        const startObj = start;
        const endObj = end;
        return {
            start: {
                line: Number(startObj.line ?? 0),
                character: Number(startObj.character ?? 0)
            },
            end: {
                line: Number(endObj.line ?? 0),
                character: Number(endObj.character ?? 0)
            }
        };
    }
    /**
     * Normalize an array of ranges
     */
    normalizeRanges(ranges) {
        if (!Array.isArray(ranges)) {
            return [];
        }
        const results = [];
        for (const range of ranges) {
            const normalized = this.normalizeRange(range);
            if (normalized) {
                results.push(normalized);
            }
        }
        return results;
    }
    /**
     * Normalize symbol kind from number to string label
     */
    normalizeSymbolKind(kind) {
        if (typeof kind === 'number') {
            return SYMBOL_KIND_LABELS[kind] ?? String(kind);
        }
        if (typeof kind === 'string') {
            const trimmed = kind.trim();
            if (trimmed === '') {
                return undefined;
            }
            const numeric = Number(trimmed);
            if (Number.isFinite(numeric) && SYMBOL_KIND_LABELS[numeric]) {
                return SYMBOL_KIND_LABELS[numeric];
            }
            return trimmed;
        }
        return undefined;
    }
    // ============================================================================
    // Hover Normalization
    // ============================================================================
    /**
     * Normalize hover contents to string
     */
    normalizeHoverContents(contents) {
        if (!contents) {
            return '';
        }
        if (typeof contents === 'string') {
            return contents;
        }
        if (Array.isArray(contents)) {
            const parts = contents
                .map((item) => this.normalizeHoverContents(item))
                .map((item) => item.trim())
                .filter((item) => item.length > 0);
            return parts.join('\n');
        }
        if (typeof contents === 'object') {
            const contentsObj = contents;
            const value = contentsObj.value;
            if (typeof value === 'string') {
                const language = contentsObj.language;
                if (typeof language === 'string' && language.trim() !== '') {
                    return `\`\`\`${language}\n${value}\n\`\`\``;
                }
                return value;
            }
        }
        return '';
    }
    /**
     * Normalize hover result
     */
    normalizeHoverResult(response, serverName) {
        if (!response) {
            return null;
        }
        if (typeof response !== 'object') {
            const contents = this.normalizeHoverContents(response);
            if (!contents.trim()) {
                return null;
            }
            return {
                contents,
                serverName
            };
        }
        const responseObj = response;
        const contents = this.normalizeHoverContents(responseObj.contents);
        if (!contents.trim()) {
            return null;
        }
        const range = this.normalizeRange(responseObj.range);
        return {
            contents,
            range: range ?? undefined,
            serverName
        };
    }
    // ============================================================================
    // Call Hierarchy Normalization
    // ============================================================================
    /**
     * Normalize call hierarchy item
     */
    normalizeCallHierarchyItem(item, serverName) {
        if (!item || typeof item !== 'object') {
            return null;
        }
        const itemObj = item;
        const nameValue = itemObj.name ?? itemObj.label ?? 'symbol';
        const name = typeof nameValue === 'string' ? nameValue : String(nameValue ?? '');
        const uri = itemObj.uri;
        if (!name || typeof uri !== 'string') {
            return null;
        }
        const range = this.normalizeRange(itemObj.range);
        const selectionRange = this.normalizeRange(itemObj.selectionRange) ?? range;
        if (!range || !selectionRange) {
            return null;
        }
        const serverOverride = typeof itemObj.serverName === 'string'
            ? itemObj.serverName
            : undefined;
        // Preserve raw numeric kind for server communication
        let rawKind;
        if (typeof itemObj.rawKind === 'number') {
            rawKind = itemObj.rawKind;
        }
        else if (typeof itemObj.kind === 'number') {
            rawKind = itemObj.kind;
        }
        else if (typeof itemObj.kind === 'string') {
            const parsed = Number(itemObj.kind);
            if (Number.isFinite(parsed)) {
                rawKind = parsed;
            }
        }
        return {
            name,
            kind: this.normalizeSymbolKind(itemObj.kind),
            rawKind,
            detail: typeof itemObj.detail === 'string'
                ? itemObj.detail
                : undefined,
            uri,
            range,
            selectionRange,
            data: itemObj.data,
            serverName: serverOverride ?? serverName
        };
    }
    /**
     * Normalize incoming call
     */
    normalizeIncomingCall(item, serverName) {
        if (!item || typeof item !== 'object') {
            return null;
        }
        const itemObj = item;
        const from = this.normalizeCallHierarchyItem(itemObj.from, serverName);
        if (!from) {
            return null;
        }
        return {
            from,
            fromRanges: this.normalizeRanges(itemObj.fromRanges)
        };
    }
    /**
     * Normalize outgoing call
     */
    normalizeOutgoingCall(item, serverName) {
        if (!item || typeof item !== 'object') {
            return null;
        }
        const itemObj = item;
        const to = this.normalizeCallHierarchyItem(itemObj.to, serverName);
        if (!to) {
            return null;
        }
        return {
            to,
            fromRanges: this.normalizeRanges(itemObj.fromRanges)
        };
    }
    /**
     * Convert call hierarchy item back to LSP params format
     */
    toCallHierarchyItemParams(item) {
        // Use rawKind (numeric) for server communication
        let numericKind = item.rawKind;
        if (numericKind === undefined && item.kind !== undefined) {
            const parsed = Number(item.kind);
            if (Number.isFinite(parsed)) {
                numericKind = parsed;
            }
        }
        return {
            name: item.name,
            kind: numericKind,
            detail: item.detail,
            uri: item.uri,
            range: item.range,
            selectionRange: item.selectionRange,
            data: item.data
        };
    }
    // ============================================================================
    // Document Symbol Helpers
    // ============================================================================
    /**
     * Check if item is a DocumentSymbol (has range and selectionRange)
     */
    isDocumentSymbol(item) {
        const range = item.range;
        const selectionRange = item.selectionRange;
        return (typeof range === 'object' &&
            range !== null &&
            typeof selectionRange === 'object' &&
            selectionRange !== null);
    }
    /**
     * Recursively collect document symbols from a tree structure
     */
    collectDocumentSymbol(item, uri, serverName, results, limit, containerName) {
        if (results.length >= limit) {
            return;
        }
        const nameValue = item.name ?? item.label ?? 'symbol';
        const name = typeof nameValue === 'string' ? nameValue : String(nameValue);
        const selectionRange = this.normalizeRange(item.selectionRange) ??
            this.normalizeRange(item.range);
        if (!selectionRange) {
            return;
        }
        results.push({
            name,
            kind: this.normalizeSymbolKind(item.kind),
            containerName,
            location: {
                uri,
                range: selectionRange
            },
            serverName
        });
        if (results.length >= limit) {
            return;
        }
        const children = item.children;
        if (Array.isArray(children)) {
            for (const child of children) {
                if (results.length >= limit) {
                    break;
                }
                if (child && typeof child === 'object') {
                    this.collectDocumentSymbol(child, uri, serverName, results, limit, name);
                }
            }
        }
    }
}
//# sourceMappingURL=LspResponseNormalizer.js.map