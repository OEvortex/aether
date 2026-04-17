/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type IdeInfo } from '../ide/detect-ide.js';
export type DiffUpdateResult = {
    status: 'accepted';
    content?: string;
} | {
    status: 'rejected';
    content: undefined;
};
export type IDEConnectionState = {
    status: IDEConnectionStatus;
    details?: string;
};
export declare enum IDEConnectionStatus {
    Connected = "connected",
    Disconnected = "disconnected",
    Connecting = "connecting"
}
type StdioConfig = {
    command: string;
    args: string[];
};
type ConnectionConfig = {
    port?: string;
    authToken?: string;
    stdio?: StdioConfig;
};
type IdeConnectionConfig = ConnectionConfig & {
    workspacePath?: string;
    ideInfo?: IdeInfo;
    ppid?: number;
};
/**
 * Manages the connection to and interaction with the IDE server.
 */
export declare class IdeClient {
    private static instancePromise;
    private client;
    private state;
    private currentIde;
    private ideProcessInfo;
    private connectionConfig;
    private authToken;
    private diffResponses;
    private statusListeners;
    private trustChangeListeners;
    private availableTools;
    /**
     * A mutex to ensure that only one diff view is open in the IDE at a time.
     * This prevents race conditions and UI issues in IDEs like VSCode that
     * can't handle multiple diff views being opened simultaneously.
     */
    private diffMutex;
    private constructor();
    static getInstance(): Promise<IdeClient>;
    addStatusChangeListener(listener: (state: IDEConnectionState) => void): void;
    removeStatusChangeListener(listener: (state: IDEConnectionState) => void): void;
    addTrustChangeListener(listener: (isTrusted: boolean) => void): void;
    removeTrustChangeListener(listener: (isTrusted: boolean) => void): void;
    connect(): Promise<void>;
    /**
     * Opens a diff view in the IDE, allowing the user to review and accept or
     * reject changes.
     *
     * This method sends a request to the IDE to display a diff between the
     * current content of a file and the new content provided. It then waits for
     * a notification from the IDE indicating that the user has either accepted
     * (potentially with manual edits) or rejected the diff.
     *
     * A mutex ensures that only one diff view can be open at a time to prevent
     * race conditions.
     *
     * @param filePath The absolute path to the file to be diffed.
     * @param newContent The proposed new content for the file.
     * @returns A promise that resolves with a `DiffUpdateResult`, indicating
     *   whether the diff was 'accepted' or 'rejected' and including the final
     *   content if accepted.
     */
    openDiff(filePath: string, newContent: string): Promise<DiffUpdateResult>;
    /**
     * Acquires a lock to ensure sequential execution of critical sections.
     *
     * This method implements a promise-based mutex. It works by chaining promises.
     * Each call to `acquireMutex` gets the current `diffMutex` promise. It then
     * creates a *new* promise (`newMutex`) that will be resolved when the caller
     * invokes the returned `release` function. The `diffMutex` is immediately
     * updated to this `newMutex`.
     *
     * The method returns a promise that resolves with the `release` function only
     * *after* the *previous* `diffMutex` promise has resolved. This creates a
     * queue where each subsequent operation must wait for the previous one to release
     * the lock.
     *
     * @returns A promise that resolves to a function that must be called to
     *   release the lock.
     */
    private acquireMutex;
    closeDiff(filePath: string, options?: {
        suppressNotification?: boolean;
    }): Promise<string | undefined>;
    resolveDiffFromCli(filePath: string, outcome: 'accepted' | 'rejected'): Promise<void>;
    disconnect(): Promise<void>;
    getCurrentIde(): IdeInfo | undefined;
    getConnectionStatus(): IDEConnectionState;
    getDetectedIdeDisplayName(): string | undefined;
    isDiffingEnabled(): boolean;
    private discoverTools;
    private setState;
    static validateWorkspacePath(ideWorkspacePath: string | undefined, cwd: string): {
        isValid: boolean;
        error?: string;
    };
    private getPortFromEnv;
    private getStdioConfigFromEnv;
    private getConnectionConfigFromFile;
    private getLegacyConnectionConfig;
    protected getAllConnectionConfigs(ideDir: string): Promise<IdeConnectionConfig[]>;
    private cleanupStaleLockFile;
    private tryFallbackPorts;
    private createProxyAwareFetch;
    private registerClientHandlers;
    private establishHttpConnection;
    private tryHttpConnect;
    private establishStdioConnection;
}
/**
 * Reset the cached host promise. Exported for testing only.
 * @internal
 */
export declare function _resetCachedIdeServerHost(): void;
export declare function getIdeServerHost(): Promise<string>;
export {};
