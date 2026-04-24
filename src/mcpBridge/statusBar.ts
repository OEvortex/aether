/*---------------------------------------------------------------------------------------------
 *  MCP Bridge Status Bar
 *  Shows MCP server status and tool count in status bar
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import type { ToolRegistry } from './toolRegistry';

export class BridgeStatusBar implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;
    private disposables: vscode.Disposable[] = [];
    private serverPort: number | undefined;

    constructor(private readonly registry: ToolRegistry) {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'aether.mcpBridge.toolsView.focus';
        this.statusBarItem.tooltip = 'Aether MCP Bridge';
        this.disposables.push(
            this.statusBarItem,
            registry.onDidChangeTools(() => this.updateToolCount())
        );
    }

    setServerInfo(port: number): void {
        this.serverPort = port;
        this.updateToolCount();
        this.statusBarItem.show();
    }

    clearServerInfo(): void {
        this.serverPort = undefined;
        this.statusBarItem.hide();
    }

    private updateToolCount(): void {
        if (this.serverPort === undefined) {
            return;
        }
        const exposedCount = this.registry.getExposedTools().length;
        this.statusBarItem.text = `$(broadcast) MCP:${this.serverPort} | ${exposedCount} tools`;
    }

    dispose(): void {
        for (const d of this.disposables) {
            d.dispose();
        }
        this.disposables = [];
        this.statusBarItem.dispose();
    }
}
