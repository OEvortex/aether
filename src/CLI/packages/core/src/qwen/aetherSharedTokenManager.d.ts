/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import type { IAetherOAuth2Client } from './aetherOAuth2.js';
import { type AetherCredentials } from './aetherOAuth2.js';
interface LockConfig {
    maxAttempts: number;
    attemptInterval: number;
    maxInterval: number;
}
/**
 * Token manager error types for better error classification
 */
export declare enum TokenError {
    REFRESH_FAILED = "REFRESH_FAILED",
    NO_REFRESH_TOKEN = "NO_REFRESH_TOKEN",
    LOCK_TIMEOUT = "LOCK_TIMEOUT",
    FILE_ACCESS_ERROR = "FILE_ACCESS_ERROR",
    NETWORK_ERROR = "NETWORK_ERROR"
}
/**
 * Custom error class for token manager operations
 */
export declare class TokenManagerError extends Error {
    type: TokenError;
    originalError?: unknown | undefined;
    constructor(type: TokenError, message: string, originalError?: unknown | undefined);
}
/**
 * Manages OAuth tokens across multiple processes using file-based caching and locking
 */
export declare class SharedTokenManager {
    private static instance;
    /**
     * In-memory cache for credentials and file state tracking
     */
    private memoryCache;
    /**
     * Promise tracking any ongoing token refresh operation
     */
    private refreshPromise;
    /**
     * Promise tracking any ongoing file check operation to prevent concurrent checks
     */
    private checkPromise;
    /**
     * Whether cleanup handlers have been registered
     */
    private cleanupHandlersRegistered;
    /**
     * Reference to cleanup functions for proper removal
     */
    private cleanupFunction;
    /**
     * Lock configuration for testing purposes
     */
    private lockConfig;
    /**
     * Private constructor for singleton pattern
     */
    private constructor();
    /**
     * Get the singleton instance
     * @returns The shared token manager instance
     */
    static getInstance(): SharedTokenManager;
    /**
     * Set up handlers to clean up lock files when the process exits
     */
    private registerCleanupHandlers;
    /**
     * Get valid OAuth credentials, refreshing them if necessary
     *
     * @param aetherClient - The OAuth2 client instance
     * @param forceRefresh - If true, refresh token even if current one is still valid
     * @returns Promise resolving to valid credentials
     * @throws TokenManagerError if unable to obtain valid credentials
     */
    getValidCredentials(aetherClient: IAetherOAuth2Client, forceRefresh?: boolean): Promise<AetherCredentials>;
    /**
     * Check if the credentials file was updated by another process and reload if so
     * Uses promise-based locking to prevent concurrent file checks
     */
    private checkAndReloadIfNeeded;
    /**
     * Utility method to add timeout to any promise operation
     * Properly cleans up the timeout when the promise completes
     */
    private withTimeout;
    /**
     * Perform the actual file check and reload operation
     * This is separated to enable proper promise-based synchronization
     */
    private performFileCheck;
    /**
     * Force a file check without time-based throttling (used during refresh operations)
     */
    private forceFileCheck;
    /**
     * Load credentials from the file system into memory cache and sync with aetherClient
     */
    private reloadCredentialsFromFile;
    /**
     * Refresh the OAuth token using file locking to prevent concurrent refreshes
     *
     * @param aetherClient - The OAuth2 client instance
     * @param forceRefresh - If true, skip checking if token is already valid after getting lock
     * @returns Promise resolving to refreshed credentials
     * @throws TokenManagerError if refresh fails or lock cannot be acquired
     */
    private performTokenRefresh;
    /**
     * Save credentials to file and update the cached file modification time
     *
     * @param credentials - The credentials to save
     */
    private saveCredentialsToFile;
    /**
     * Check if the token is valid and not expired
     *
     * @param credentials - The credentials to validate
     * @returns true if token is valid and not expired, false otherwise
     */
    private isTokenValid;
    /**
     * Get the full path to the credentials file
     *
     * @returns The absolute path to the credentials file
     */
    private getCredentialFilePath;
    /**
     * Get the full path to the lock file
     *
     * @returns The absolute path to the lock file
     */
    private getLockFilePath;
    /**
     * Acquire a file lock to prevent other processes from refreshing tokens simultaneously
     *
     * @param lockPath - Path to the lock file
     * @throws TokenManagerError if lock cannot be acquired within timeout period
     */
    private acquireLock;
    /**
     * Release the file lock
     *
     * @param lockPath - Path to the lock file
     */
    private releaseLock;
    /**
     * Atomically update cache state to prevent inconsistent intermediate states
     * @param credentials - New credentials to cache
     * @param fileModTime - File modification time
     * @param lastCheck - Last check timestamp (optional, defaults to current time)
     */
    private updateCacheState;
    /**
     * Clear all cached data and reset the manager to initial state
     */
    clearCache(): void;
    /**
     * Get the current cached credentials (may be expired)
     *
     * @returns The currently cached credentials or null
     */
    getCurrentCredentials(): AetherCredentials | null;
    /**
     * Check if there's an ongoing refresh operation
     *
     * @returns true if refresh is in progress, false otherwise
     */
    isRefreshInProgress(): boolean;
    /**
     * Set lock configuration for testing purposes
     * @param config - Lock configuration
     */
    setLockConfig(config: Partial<LockConfig>): void;
    /**
     * Clean up event listeners (primarily for testing)
     */
    cleanup(): void;
    /**
     * Get a summary of the current state for debugging
     *
     * @returns Object containing current state information
     */
    getDebugInfo(): {
        hasCredentials: boolean;
        credentialsExpired: boolean;
        isRefreshing: boolean;
        cacheAge: number;
    };
}
export {};
