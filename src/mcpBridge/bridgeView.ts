/*---------------------------------------------------------------------------------------------
 *  MCP Bridge Tree View
 *  Activity Bar view showing tools grouped by extension with checkboxes
 *  Enhanced UI with rich tooltips, colored icons, and context menus
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import type { ToolRegistry } from './toolRegistry';
import type { BridgedTool } from './types';

type TreeElement = ExtensionTreeItem | ToolTreeItem | EmptyTreeItem;

export class ExtensionTreeItem extends vscode.TreeItem {
    readonly toggleableToolNames: string[];

    constructor(
        public readonly extensionId: string,
        displayName: string,
        totalTools: number,
        exposedTools: number,
        disabledTools: number,
        toggleableToolNames: string[]
    ) {
        super(displayName, vscode.TreeItemCollapsibleState.Expanded);
        this.extensionId = extensionId;
        this.toggleableToolNames = toggleableToolNames;

        const parts: string[] = [`${exposedTools}/${totalTools} exposed`];
        if (disabledTools > 0) {
            parts.push(`${disabledTools} disabled`);
        }
        this.description = parts.join(', ');

        this.iconPath = new vscode.ThemeIcon('extensions');
        this.contextValue = 'aether-mcp-extension';

        if (toggleableToolNames.length > 0) {
            this.checkboxState =
                exposedTools >= toggleableToolNames.length
                    ? vscode.TreeItemCheckboxState.Checked
                    : vscode.TreeItemCheckboxState.Unchecked;
        }

        this.tooltip = new vscode.MarkdownString(
            `**${displayName}**\n\n` +
                `Extension ID: \`${extensionId}\`\n\n` +
                `Tools: ${totalTools} total, ${exposedTools} exposed` +
                (disabledTools > 0
                    ? `, ${disabledTools} disabled in VS Code`
                    : '')
        );
    }
}

export class ToolTreeItem extends vscode.TreeItem {
    public readonly toolName: string;

    constructor(tool: BridgedTool, displayName?: string) {
        const _name = displayName ?? tool.name;
        const underscoreIdx = tool.name.indexOf('_');
        const shortName =
            underscoreIdx !== -1
                ? tool.name.slice(underscoreIdx + 1)
                : tool.name;

        super(shortName, vscode.TreeItemCollapsibleState.None);
        this.toolName = tool.name;

        this.description = tool.shortDescription || undefined;

        if (tool.disabledInVscode) {
            this.iconPath = new vscode.ThemeIcon(
                'lock',
                new vscode.ThemeColor('disabledForeground')
            );
            this.contextValue = 'aether-mcp-tool-disabled';
            this.checkboxState = vscode.TreeItemCheckboxState.Unchecked;
        } else {
            const iconId = tool.toolIconId ?? 'tools';
            if (tool.exposed) {
                this.iconPath = new vscode.ThemeIcon(
                    iconId,
                    new vscode.ThemeColor('charts.green')
                );
                this.contextValue = 'aether-mcp-tool-exposed';
            } else {
                this.iconPath = new vscode.ThemeIcon(
                    iconId,
                    new vscode.ThemeColor('disabledForeground')
                );
                this.contextValue = 'aether-mcp-tool-hidden';
            }
            this.checkboxState = tool.exposed
                ? vscode.TreeItemCheckboxState.Checked
                : vscode.TreeItemCheckboxState.Unchecked;
        }

        const md = new vscode.MarkdownString();
        md.appendMarkdown(`**${tool.name}**\n\n`);

        if (tool.description !== '') {
            md.appendMarkdown(`${tool.description}\n\n`);
        }

        md.appendMarkdown('---\n\n');
        md.appendMarkdown(`**Extension:** ${tool.extensionDisplayName}\n\n`);

        if (tool.disabledInVscode) {
            md.appendMarkdown(
                `**Status:** Disabled in VS Code (extension not activated or tool disabled)\n\n`
            );
        } else {
            md.appendMarkdown(
                `**Status:** ${tool.exposed ? 'Exposed' : 'Hidden'}\n\n`
            );
        }

        if (tool.invocationCount > 0) {
            md.appendMarkdown(`**Invocations:** ${tool.invocationCount}\n\n`);
        }

        if (tool.tags && tool.tags.length > 0) {
            md.appendMarkdown(`**Tags:** ${tool.tags.join(', ')}\n\n`);
        }

        if (tool.inputSchema !== undefined) {
            md.appendMarkdown(`**Input Schema:**\n`);
            md.appendCodeblock(
                JSON.stringify(tool.inputSchema, null, 2),
                'json'
            );
        }

        this.tooltip = md;
    }
}

export class EmptyTreeItem extends vscode.TreeItem {
    constructor() {
        super('No LM tools detected', vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('info');
        this.tooltip =
            'No language model tools are currently registered in VS Code. Install extensions that provide LM tools or enable the Aether providers.';
        this.contextValue = 'aether-mcp-empty';
    }
}

export class BridgeViewProvider
    implements vscode.TreeDataProvider<TreeElement>
{
    private _onDidChangeTreeData = new vscode.EventEmitter<
        TreeElement | undefined
    >();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private _onDidChangeCheckboxState = new vscode.EventEmitter<
        vscode.TreeCheckboxChangeEvent<TreeElement>
    >();
    readonly onDidChangeCheckboxState = this._onDidChangeCheckboxState.event;

    private groupCache = new Map<string, BridgedTool[]>();
    private disposables: vscode.Disposable[] = [];

    constructor(private readonly registry: ToolRegistry) {
        this.disposables.push(
            registry.onDidChangeTools(() =>
                this._onDidChangeTreeData.fire(undefined)
            )
        );
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration('aether.mcpBridge')) {
                    this._onDidChangeTreeData.fire(undefined);
                }
            })
        );
    }

    getTreeItem(element: TreeElement): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TreeElement): Thenable<TreeElement[]> {
        if (element === undefined) {
            return Promise.resolve(this.getRootChildren());
        }

        if (element instanceof ExtensionTreeItem) {
            return Promise.resolve(this.getGroupChildren(element.extensionId));
        }

        return Promise.resolve([]);
    }

    private rebuildGroupCache(): void {
        this.groupCache.clear();
        const allTools = this.registry.getAllTools();
        const byExtension = new Map<string, BridgedTool[]>();

        for (const tool of allTools) {
            const key = tool.extensionId;
            if (!byExtension.has(key)) {
                byExtension.set(key, []);
            }
            const extGroup = byExtension.get(key);
            extGroup?.push(tool);
        }

        for (const [extId, extTools] of byExtension) {
            this.groupCache.set(
                extId,
                extTools.sort((a, b) => a.name.localeCompare(b.name))
            );
        }
    }

    private getRootChildren(): TreeElement[] {
        const allTools = this.registry.getAllTools();
        if (allTools.length === 0) {
            return [new EmptyTreeItem()];
        }

        this.rebuildGroupCache();

        if (this.groupCache.size === 0) {
            return [new EmptyTreeItem()];
        }

        const result: TreeElement[] = [];
        for (const [extId, tools] of this.groupCache) {
            const displayName = tools[0]?.extensionDisplayName ?? extId;
            const toggleable = tools.filter((t) => !t.disabledInVscode);
            const exposedCount = toggleable.filter((t) => t.exposed).length;
            const disabledCount = tools.filter(
                (t) => t.disabledInVscode
            ).length;

            result.push(
                new ExtensionTreeItem(
                    extId,
                    displayName,
                    tools.length,
                    exposedCount,
                    disabledCount,
                    toggleable.map((t) => t.name)
                )
            );
        }

        return result.sort((a, b) =>
            (a.label as string).localeCompare(b.label as string)
        );
    }

    private getGroupChildren(extensionId: string): ToolTreeItem[] {
        let tools = this.groupCache.get(extensionId);
        if (tools === undefined) {
            this.rebuildGroupCache();
            tools = this.groupCache.get(extensionId) ?? [];
        }
        return tools.map((tool) => new ToolTreeItem(tool));
    }

    dispose(): void {
        this._onDidChangeTreeData.dispose();
        for (const d of this.disposables) {
            d.dispose();
        }
        this.disposables = [];
        this.groupCache.clear();
    }
}
