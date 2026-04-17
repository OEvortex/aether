/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export type PtyImplementation = {
    module: any;
    name: 'lydell-node-pty' | 'node-pty';
} | null;
export interface PtyProcess {
    readonly pid: number;
    onData(callback: (data: string) => void): void;
    onExit(callback: (e: {
        exitCode: number;
        signal?: number;
    }) => void): void;
    kill(signal?: string): void;
}
export declare const getPty: () => Promise<PtyImplementation>;
