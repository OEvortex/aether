/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export declare const AETHER_DIR = ".aether";
export declare const GOOGLE_ACCOUNTS_FILENAME = "google_accounts.json";
export declare const OAUTH_FILE = "oauth_creds.json";
export declare const SKILL_PROVIDER_CONFIG_DIRS: string[];
export declare class Storage {
    private readonly targetDir;
    /**
     * Custom runtime output base directory set via settings.
     * When null, falls back to getGlobalAetherDir().
     */
    private static runtimeBaseDir;
    private static readonly runtimeBaseDirContext;
    constructor(targetDir: string);
    private static resolveRuntimeBaseDir;
    /**
     * Sets the custom runtime output base directory.
     * Handles tilde (~) expansion and resolves relative paths to absolute.
     * Pass null/undefined/empty string to reset to default (getGlobalAetherDir()).
     * @param dir - The directory path, or null/undefined to reset
     * @param cwd - Base directory for resolving relative paths (defaults to process.cwd()).
     *              Pass the project root so that relative values like ".aether" resolve
     *              per-project, enabling a single global config to work across all projects.
     */
    static setRuntimeBaseDir(dir: string | null | undefined, cwd?: string): void;
    /**
     * Runs function execution in an async context with a specific runtime output dir.
     * This is used to isolate runtime output paths between concurrent sessions.
     */
    static runWithRuntimeBaseDir<T>(dir: string | null | undefined, cwd: string | undefined, fn: () => T): T;
    /**
     * Returns the base directory for all runtime output (temp files, debug logs,
     * session data, todos, insights, etc.).
     *
     * Priority: AETHER_RUNTIME_DIR env var > setRuntimeBaseDir() value > getGlobalAetherDir()
     * @returns Absolute path to the runtime output base directory
     */
    static getRuntimeBaseDir(): string;
    static getGlobalAetherDir(): string;
    static getMcpOAuthTokensPath(): string;
    static getGlobalSettingsPath(): string;
    static getInstallationIdPath(): string;
    static getGoogleAccountsPath(): string;
    static getUserCommandsDir(): string;
    static getGlobalMemoryFilePath(): string;
    static getGlobalTempDir(): string;
    static getGlobalDebugDir(): string;
    static getDebugLogPath(sessionId: string): string;
    static getGlobalIdeDir(): string;
    static getGlobalBinDir(): string;
    static getGlobalArenaDir(): string;
    getAetherDir(): string;
    getProjectDir(): string;
    getProjectTempDir(): string;
    ensureProjectTempDirExists(): void;
    static getOAuthCredsPath(): string;
    getProjectRoot(): string;
    getHistoryDir(): string;
    getWorkspaceSettingsPath(): string;
    getProjectCommandsDir(): string;
    getProjectTempCheckpointsDir(): string;
    getExtensionsDir(): string;
    getExtensionsConfigPath(): string;
    getUserSkillsDirs(): string[];
    /**
     * Returns the user-level extensions directory (~/.aether/extensions/).
     * Extensions installed at user scope are stored here, as opposed to
     * project-level extensions which live in <project>/.aether/extensions/.
     */
    static getUserExtensionsDir(): string;
    getHistoryFilePath(): string;
}
