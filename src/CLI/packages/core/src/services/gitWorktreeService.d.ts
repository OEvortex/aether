/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Commit message used for the baseline snapshot in worktrees.
 * After overlaying the user's dirty state (tracked changes + untracked files),
 * a commit with this message is created so that later diffs only capture the
 * agent's changes — not the pre-existing local edits.
 */
export declare const BASELINE_COMMIT_MESSAGE = "baseline (dirty state overlay)";
/**
 * Default directory and branch-prefix name used for worktrees.
 * Changing this value affects the on-disk layout (`~/.aether/<WORKTREES_DIR>/`)
 * **and** the default git branch prefix (`<WORKTREES_DIR>/<sessionId>/…`).
 */
export declare const WORKTREES_DIR = "worktrees";
export interface WorktreeInfo {
    /** Unique identifier for this worktree */
    id: string;
    /** Display name (e.g., model name) */
    name: string;
    /** Absolute path to the worktree directory */
    path: string;
    /** Git branch name for this worktree */
    branch: string;
    /** Whether the worktree is currently active */
    isActive: boolean;
    /** Creation timestamp */
    createdAt: number;
}
export interface WorktreeSetupConfig {
    /** Session identifier */
    sessionId: string;
    /** Source repository path (project root) */
    sourceRepoPath: string;
    /** Names/identifiers for each worktree to create */
    worktreeNames: string[];
    /** Base branch to create worktrees from (defaults to current branch) */
    baseBranch?: string;
    /** Extra metadata to persist alongside the session config */
    metadata?: Record<string, unknown>;
}
export interface CreateWorktreeResult {
    success: boolean;
    worktree?: WorktreeInfo;
    error?: string;
}
export interface WorktreeSetupResult {
    success: boolean;
    sessionId: string;
    worktrees: WorktreeInfo[];
    worktreesByName: Record<string, WorktreeInfo>;
    errors: Array<{
        name: string;
        error: string;
    }>;
}
/**
 * Service for managing git worktrees.
 *
 * Git worktrees allow multiple working directories to share a single repository,
 * enabling isolated environments without copying the entire repo.
 */
export declare class GitWorktreeService {
    private sourceRepoPath;
    private git;
    private readonly customBaseDir?;
    constructor(sourceRepoPath: string, customBaseDir?: string);
    /**
     * Gets the directory where worktrees are stored.
     * @param customDir - Optional custom base directory override
     */
    static getBaseDir(customDir?: string): string;
    /**
     * Gets the directory for a specific session.
     * @param customBaseDir - Optional custom base directory override
     */
    static getSessionDir(sessionId: string, customBaseDir?: string): string;
    /**
     * Gets the worktrees directory for a specific session.
     * @param customBaseDir - Optional custom base directory override
     */
    static getWorktreesDir(sessionId: string, customBaseDir?: string): string;
    /**
     * Instance-level base dir, using the custom dir if provided at construction.
     */
    getBaseDirForInstance(): string;
    /**
     * Checks if git is available on the system.
     */
    checkGitAvailable(): Promise<{
        available: boolean;
        error?: string;
    }>;
    /**
     * Checks if the source path is a git repository.
     */
    isGitRepository(): Promise<boolean>;
    /**
     * Initializes the source directory as a git repository.
     * Returns true if initialization was performed, false if already a repo.
     */
    initializeRepository(): Promise<{
        initialized: boolean;
        error?: string;
    }>;
    /**
     * Gets the current branch name.
     */
    getCurrentBranch(): Promise<string>;
    /**
     * Gets the current commit hash.
     */
    getCurrentCommitHash(): Promise<string>;
    /**
     * Creates a single worktree.
     */
    createWorktree(sessionId: string, name: string, baseBranch?: string): Promise<CreateWorktreeResult>;
    /**
     * Sets up all worktrees for a session.
     * This is the main entry point for worktree creation.
     */
    setupWorktrees(config: WorktreeSetupConfig): Promise<WorktreeSetupResult>;
    /**
     * Lists all worktrees for a session.
     */
    listWorktrees(sessionId: string): Promise<WorktreeInfo[]>;
    /**
     * Removes a single worktree.
     */
    removeWorktree(worktreePath: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Cleans up all worktrees and branches for a session.
     */
    cleanupSession(sessionId: string): Promise<{
        success: boolean;
        removedWorktrees: string[];
        removedBranches: string[];
        errors: string[];
    }>;
    /**
     * Gets the diff between a worktree and its baseline state.
     * Prefers the baseline commit (which includes the dirty state overlay)
     * so the diff only shows the agent's changes. Falls back to the base branch
     * when no baseline commit exists.
     */
    getWorktreeDiff(worktreePath: string, baseBranch?: string): Promise<string>;
    /**
     * Applies raw changes from a worktree back to the target working directory.
     *
     * Diffs from the baseline commit (which already includes the user's
     * dirty state) so the patch only contains the agent's new changes.
     * Falls back to merge-base when no baseline commit exists.
     */
    applyWorktreeChanges(worktreePath: string, targetPath?: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    /**
     * Lists all sessions stored in the worktree base directory.
     */
    static listSessions(customBaseDir?: string): Promise<Array<{
        sessionId: string;
        createdAt: number;
        sourceRepoPath: string;
        worktreeCount: number;
    }>>;
    /**
     * Finds the baseline commit in a worktree, if one exists.
     * Returns the commit SHA, or null if not found.
     */
    private resolveBaseline;
    /** Stages all changes, runs a callback, then resets the index. */
    private withStagedChanges;
    private sanitizeName;
    private pathExists;
}
