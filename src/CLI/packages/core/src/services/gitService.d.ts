/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Storage } from '../config/storage.js';
export declare class GitService {
    private projectRoot;
    private storage;
    constructor(projectRoot: string, storage: Storage);
    private getHistoryDir;
    initialize(): Promise<void>;
    /**
     * Creates a hidden git repository in the project root.
     * The Git repository is used to support checkpointing.
     */
    setupShadowGitRepository(): Promise<void>;
    private get shadowGitRepository();
    getCurrentCommitHash(): Promise<string>;
    createFileSnapshot(message: string): Promise<string>;
    restoreProjectFromSnapshot(commitHash: string): Promise<void>;
}
