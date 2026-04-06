/**
 * Model Selector Status Bar Item
 * Displays current selected model and allows quick switching
 */

import * as vscode from 'vscode';
import { ModelSelector, type ParsedModelId } from '../utils/modelSelector';
import { Logger } from '../utils/logger';

export class ModelSelectorStatusBar implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;
    private updateTimeout: NodeJS.Timeout | null = null;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100 // Higher priority to show on the right side
        );
        this.statusBarItem.command = 'aether.selectModel';
    }

    /**
     * Initialize status bar item
     */
    async initialize(context: vscode.ExtensionContext): Promise<void> {
        context.subscriptions.push(this);
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration('chp.selectedModel')) {
                    this.delayedUpdate(300);
                }
            })
        );

        // Listen for model changes
        context.subscriptions.push(
            ModelSelector.onDidChangeModel(() => {
                this.delayedUpdate(100);
            })
        );

        await this.updateStatus();
        this.statusBarItem.show();
    }

    /**
     * Update the status bar display
     */
    private async updateStatus(): Promise<void> {
        try {
            const currentModel = await ModelSelector.getCurrentModel();

            if (currentModel && currentModel.modelId) {
                this.statusBarItem.text = `$(symbol-misc) ${currentModel.modelId}`;
                this.statusBarItem.tooltip = new vscode.MarkdownString(
                    `**Current Model**\n\n` +
                        `- **Provider:** ${currentModel.providerId}\n` +
                        `- **Model:** ${currentModel.modelId}\n\n` +
                        `Click to change model`
                );
                this.statusBarItem.backgroundColor = undefined;
            } else {
                this.statusBarItem.text = `$(warning) Select Model`;
                this.statusBarItem.tooltip = 'No model selected. Click to select one.';
                this.statusBarItem.backgroundColor = new vscode.ThemeColor(
                    'statusBarItem.warningBackground'
                );
            }
        } catch (err) {
            Logger.error('[ModelSelectorStatusBar] Failed to update status:', err);
            this.statusBarItem.text = `$(error) Error`;
            this.statusBarItem.tooltip = 'Failed to load model information';
            this.statusBarItem.backgroundColor = new vscode.ThemeColor(
                'statusBarItem.errorBackground'
            );
        }
    }

    /**
     * Delayed update to avoid rapid refreshes
     */
    delayedUpdate(delayMs: number = 500): void {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }

        this.updateTimeout = setTimeout(async () => {
            await this.updateStatus();
            this.updateTimeout = null;
        }, delayMs);
    }

    /**
     * Show status bar
     */
    show(): void {
        this.statusBarItem.show();
    }

    /**
     * Hide status bar
     */
    hide(): void {
        this.statusBarItem.hide();
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        this.statusBarItem.dispose();
    }
}
