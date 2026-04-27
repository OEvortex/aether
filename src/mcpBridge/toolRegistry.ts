/*---------------------------------------------------------------------------------------------
 *  MCP Bridge Tool Registry
 *  Manages discovery and tracking of VS Code LM tools
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { isExtensionAllowed, isToolAllowed } from './filters';
import type {
    BridgedTool,
    DeclaredTool,
    ExtensionToolMapping,
    FilterConfig
} from './types';

const OVERRIDES_KEY = 'aether.mcpBridge.toolOverrides';

/**
 * Extract a ThemeIcon codicon id from a tool's icon declaration
 */
function extractIconId(icon: unknown): string | undefined {
    if (typeof icon !== 'string') {
        return undefined;
    }
    const match = /^\$\((.+)\)$/.exec(icon);
    if (match) {
        return match[1];
    }
    if (!icon.includes('/') && !icon.includes('\\') && !icon.includes('.')) {
        return icon;
    }
    return undefined;
}

/**
 * Shorten a description for inline display
 */
function shortenDescription(desc: string, maxLen = 80): string {
    if (desc.length <= maxLen) {
        return desc;
    }
    const firstSentence = /^[^.!?\n]+[.!?]/.exec(desc);
    if (firstSentence && firstSentence[0].length <= maxLen) {
        return firstSentence[0].trimEnd();
    }
    return `${desc.slice(0, maxLen - 1)}\u2026`;
}

export class ToolRegistry implements vscode.Disposable {
    private tools = new Map<string, BridgedTool>();
    private manualOverrides = new Map<string, boolean>();
    private pollTimer: ReturnType<typeof setInterval> | undefined;
    private disposables: vscode.Disposable[] = [];
    private _onDidChangeTools = new vscode.EventEmitter<void>();
    readonly onDidChangeTools = this._onDidChangeTools.event;

    private cachedExtensionMap: Map<string, ExtensionToolMapping> | undefined;
    private cachedDeclaredTools:
        | Map<string, { ext: ExtensionToolMapping; declared: DeclaredTool }>
        | undefined;

    constructor(
        private readonly getFilterConfig: () => FilterConfig,
        private readonly pollIntervalMs = 3000,
        private readonly outputChannel?: vscode.OutputChannel,
        private readonly storage?: vscode.Memento
    ) {
        const saved =
            storage?.get<Record<string, boolean>>(OVERRIDES_KEY) ?? {};
        for (const [name, state] of Object.entries(saved)) {
            this.manualOverrides.set(name, state);
        }
    }

    start(): void {
        this.refresh();
        this.pollTimer = setInterval(() => this.refresh(), this.pollIntervalMs);
        this.disposables.push(
            vscode.extensions.onDidChange(() => {
                this.invalidateExtensionCache();
                this.refresh();
            })
        );
        this.outputChannel?.appendLine(
            '[ToolRegistry] Started polling for tools'
        );
    }

    private buildExtensionMap(): Map<string, ExtensionToolMapping> {
        const map = new Map<string, ExtensionToolMapping>();
        for (const ext of vscode.extensions.all) {
            const pkg = ext.packageJSON as Record<string, unknown> | undefined;
            const contributes = pkg?.contributes as
                | { languageModelTools?: DeclaredTool[] }
                | undefined;
            const declaredTools = contributes?.languageModelTools;
            if (!Array.isArray(declaredTools)) {
                continue;
            }
            const displayName =
                (typeof pkg?.displayName === 'string'
                    ? pkg.displayName
                    : undefined) ?? ext.id;
            for (const dt of declaredTools) {
                if (typeof dt.name === 'string') {
                    map.set(dt.name, {
                        extensionId: ext.id,
                        extensionDisplayName: displayName
                    });
                }
            }
        }
        return map;
    }

    private getDeclaredTools(): Map<
        string,
        { ext: ExtensionToolMapping; declared: DeclaredTool }
    > {
        const result = new Map<
            string,
            { ext: ExtensionToolMapping; declared: DeclaredTool }
        >();
        for (const ext of vscode.extensions.all) {
            const pkg = ext.packageJSON as Record<string, unknown> | undefined;
            const contributes = pkg?.contributes as
                | { languageModelTools?: DeclaredTool[] }
                | undefined;
            const declaredTools = contributes?.languageModelTools;
            if (!Array.isArray(declaredTools)) {
                continue;
            }
            const displayName =
                (typeof pkg?.displayName === 'string'
                    ? pkg.displayName
                    : undefined) ?? ext.id;
            for (const dt of declaredTools) {
                if (typeof dt.name === 'string') {
                    result.set(dt.name, {
                        ext: {
                            extensionId: ext.id,
                            extensionDisplayName: displayName
                        },
                        declared: dt
                    });
                }
            }
        }
        return result;
    }

    private invalidateExtensionCache(): void {
        this.cachedExtensionMap = undefined;
        this.cachedDeclaredTools = undefined;
        this.outputChannel?.appendLine(
            '[ToolRegistry] Extension cache invalidated'
        );
    }

    refresh(): void {
        const vscodeLmTools = vscode.lm.tools;
        const config = this.getFilterConfig();
        this.cachedExtensionMap ??= this.buildExtensionMap();
        this.cachedDeclaredTools ??= this.getDeclaredTools();
        const extensionMap = this.cachedExtensionMap;
        const declaredTools = this.cachedDeclaredTools;
        const currentNames = new Set<string>();
        let changed = false;

        // Process tools currently available in vscode.lm.tools
        for (const tool of vscodeLmTools) {
            currentNames.add(tool.name);
            const extInfo = extensionMap.get(tool.name);
            const extId = extInfo?.extensionId ?? 'unknown';
            const defaultExposed =
                isToolAllowed(tool.name, config) &&
                isExtensionAllowed(extId, config);
            const manualOverride = this.manualOverrides.get(tool.name);
            const exposed = manualOverride ?? defaultExposed;
            const declaredInfo = declaredTools.get(tool.name);
            const shortDesc = declaredInfo?.declared.description ?? '';
            const existing = this.tools.get(tool.name);

            if (existing === undefined) {
                this.tools.set(tool.name, {
                    name: tool.name,
                    shortDescription: shortDesc
                        ? shortenDescription(shortDesc)
                        : shortenDescription(tool.description),
                    description: tool.description,
                    toolIconId: extractIconId(declaredInfo?.declared.icon),
                    inputSchema: tool.inputSchema as
                        | Record<string, unknown>
                        | undefined,
                    tags: tool.tags,
                    exposed,
                    invocationCount: 0,
                    extensionId: extId,
                    extensionDisplayName:
                        extInfo?.extensionDisplayName ?? 'Unknown Extension',
                    disabledInVscode: false
                });
                changed = true;
            } else {
                const newExtName =
                    extInfo?.extensionDisplayName ?? 'Unknown Extension';
                if (
                    existing.description !== tool.description ||
                    existing.exposed !== exposed ||
                    existing.extensionId !== extId ||
                    existing.extensionDisplayName !== newExtName ||
                    existing.disabledInVscode ||
                    JSON.stringify(existing.inputSchema) !==
                        JSON.stringify(tool.inputSchema) ||
                    JSON.stringify(existing.tags) !== JSON.stringify(tool.tags)
                ) {
                    existing.description = tool.description;
                    existing.inputSchema = tool.inputSchema as
                        | Record<string, unknown>
                        | undefined;
                    existing.tags = tool.tags;
                    existing.exposed = exposed;
                    existing.extensionId = extId;
                    existing.extensionDisplayName = newExtName;
                    existing.disabledInVscode = false;
                    changed = true;
                }
            }
        }

        // Process tools declared in package.json but not in vscode.lm.tools
        for (const [toolName, { ext, declared }] of declaredTools) {
            if (currentNames.has(toolName)) {
                continue;
            }
            currentNames.add(toolName);
            const existing = this.tools.get(toolName);
            if (existing === undefined) {
                const fullDesc =
                    declared.modelDescription ?? declared.description ?? '';
                const shortDesc = declared.description ?? '';
                this.tools.set(toolName, {
                    name: toolName,
                    shortDescription: shortDesc
                        ? shortenDescription(shortDesc)
                        : shortenDescription(fullDesc),
                    description: fullDesc,
                    toolIconId: extractIconId(declared.icon),
                    inputSchema: declared.inputSchema,
                    tags: [],
                    exposed: false,
                    invocationCount: 0,
                    extensionId: ext.extensionId,
                    extensionDisplayName: ext.extensionDisplayName,
                    disabledInVscode: true
                });
                changed = true;
            } else if (!existing.disabledInVscode) {
                existing.disabledInVscode = true;
                existing.exposed = false;
                changed = true;
            }
        }

        // Remove tools that no longer exist
        for (const [name] of this.tools) {
            if (!currentNames.has(name)) {
                this.tools.delete(name);
                this.manualOverrides.delete(name);
                changed = true;
            }
        }

        if (changed) {
            this._onDidChangeTools.fire();
            this.persistOverrides();
            this.outputChannel?.appendLine(
                `[ToolRegistry] Tools updated, total: ${this.tools.size}, exposed: ${this.getExposedTools().length}`
            );
        }
    }

    getAllTools(): BridgedTool[] {
        return Array.from(this.tools.values());
    }

    getExposedTools(): BridgedTool[] {
        return Array.from(this.tools.values()).filter(
            (t) => t.exposed && !t.disabledInVscode
        );
    }

    getTool(name: string): BridgedTool | undefined {
        return this.tools.get(name);
    }

    recordInvocation(name: string): void {
        const tool = this.tools.get(name);
        if (tool !== undefined) {
            tool.invocationCount++;
        }
    }

    toggleTool(name: string): void {
        const tool = this.tools.get(name);
        if (tool !== undefined && !tool.disabledInVscode) {
            const newState = !tool.exposed;
            tool.exposed = newState;
            this.manualOverrides.set(name, newState);
            this.persistOverrides();
            this._onDidChangeTools.fire();
        }
    }

    setGroupExposed(toolNames: string[], exposed: boolean): void {
        let changed = false;
        for (const name of toolNames) {
            const tool = this.tools.get(name);
            if (tool !== undefined && !tool.disabledInVscode) {
                tool.exposed = exposed;
                this.manualOverrides.set(name, exposed);
                changed = true;
            }
        }
        if (changed) {
            this.persistOverrides();
            this._onDidChangeTools.fire();
        }
    }

    private persistOverrides(): void {
        const record: Record<string, boolean> = {};
        for (const [name, state] of this.manualOverrides) {
            record[name] = state;
        }
        void this.storage?.update(OVERRIDES_KEY, record);
    }

    clearManualOverrides(): void {
        this.manualOverrides.clear();
        this.refresh();
    }

    getExtensionIds(): string[] {
        const ids = new Set<string>();
        for (const tool of this.tools.values()) {
            ids.add(tool.extensionId);
        }
        return Array.from(ids).sort();
    }

    getToolsByExtension(extensionId: string): BridgedTool[] {
        return Array.from(this.tools.values())
            .filter((t) => t.extensionId === extensionId)
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    dispose(): void {
        if (this.pollTimer !== undefined) {
            clearInterval(this.pollTimer);
            this.pollTimer = undefined;
        }
        this._onDidChangeTools.dispose();
        for (const d of this.disposables) {
            d.dispose();
        }
        this.disposables = [];
        this.outputChannel?.appendLine('[ToolRegistry] Disposed');
    }
}
