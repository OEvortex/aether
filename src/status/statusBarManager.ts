/*---------------------------------------------------------------------------------------------
 *  Status Bar Manager
 *  Global static manager, unifies lifecycle management and operations of all status bar items
 *--------------------------------------------------------------------------------------------*/

import type * as vscode from 'vscode';
import { StatusLogger } from '../utils/statusLogger.js';

interface IStatusBar {
    initialize(context: vscode.ExtensionContext): Promise<void>;
    checkAndShowStatus(): Promise<void>;
    delayedUpdate(delayMs?: number): void;
    dispose(): void;
}

export class StatusBarManager {
    private static statusBars: Map<string, IStatusBar> = new Map<
        string,
        IStatusBar
    >();
    private static initialized = false;

    private static registerBuiltInStatusBars(): void {}

    static registerStatusBar(key: string, statusBar: IStatusBar): void {
        if (StatusBarManager.statusBars.has(key)) {
            StatusLogger.warn(
                `[StatusBarManager] Status bar item ${key} already exists, overwriting registration`
            );
        }
        StatusBarManager.statusBars.set(key, statusBar);
    }

    static getStatusBar(key: string): IStatusBar | undefined {
        return StatusBarManager.statusBars.get(key);
    }

    static async initializeAll(
        context: vscode.ExtensionContext
    ): Promise<void> {
        if (StatusBarManager.initialized) {
            StatusLogger.warn(
                '[StatusBarManager] Status bar manager already initialized, skipping duplicate initialization'
            );
            return;
        }

        StatusBarManager.registerBuiltInStatusBars();

        StatusLogger.info(
            `[StatusBarManager] Starting initialization of ${StatusBarManager.statusBars.size} status bar items`
        );

        const initPromises = Array.from(
            StatusBarManager.statusBars.entries()
        ).map(async ([key, statusBar]) => {
            const startTime = Date.now();
            try {
                await statusBar.initialize(context);
                const duration = Date.now() - startTime;
                StatusLogger.debug(
                    `[StatusBarManager] Status bar item ${key} initialized successfully (duration: ${duration}ms)`
                );
            } catch (error) {
                const duration = Date.now() - startTime;
                StatusLogger.error(
                    `[StatusBarManager] Status bar item ${key} initialization failed (duration: ${duration}ms)`,
                    error
                );
            }
        });

        await Promise.all(initPromises);

        StatusBarManager.initialized = true;
        StatusLogger.info(
            '[StatusBarManager] All status bar items initialization completed'
        );
    }

    static async checkAndShowStatus(key: string): Promise<void> {
        const statusBar = StatusBarManager.getStatusBar(key);
        if (statusBar) {
            try {
                await statusBar.checkAndShowStatus();
            } catch (error) {
                StatusLogger.error(
                    `[StatusBarManager] Failed to check and show status bar ${key}`,
                    error
                );
            }
        } else {
            StatusLogger.warn(
                `[StatusBarManager] Status bar item ${key} not found`
            );
        }
    }

    static delayedUpdate(key: string, delayMs?: number): void {
        const statusBar = StatusBarManager.getStatusBar(key);
        if (statusBar) {
            statusBar.delayedUpdate(delayMs);
        } else {
            StatusLogger.warn(
                `[StatusBarManager] Status bar item ${key} not found`
            );
        }
    }

    static disposeAll(): void {
        for (const [key, statusBar] of StatusBarManager.statusBars) {
            try {
                statusBar.dispose();
                StatusLogger.debug(
                    `[StatusBarManager] Status bar item ${key} disposed`
                );
            } catch (error) {
                StatusLogger.error(
                    `[StatusBarManager] Failed to dispose status bar item ${key}`,
                    error
                );
            }
        }
        StatusBarManager.statusBars.clear();
        StatusBarManager.initialized = false;
    }

    static getRegisteredKeys(): string[] {
        return Array.from(StatusBarManager.statusBars.keys());
    }

    static isInitialized(): boolean {
        return StatusBarManager.initialized;
    }
}
