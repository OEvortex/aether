/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 *
 * Copy-on-Write Overlay Filesystem
 *
 * Provides file isolation for speculative execution. Writes go to a temporary
 * overlay directory while reads resolve to overlay (if previously written)
 * or the real filesystem.
 */
/**
 * Copy-on-write overlay filesystem for speculation safety.
 */
export declare class OverlayFs {
    private readonly realCwd;
    private readonly overlayDir;
    private readonly writtenFiles;
    constructor(realCwd: string);
    /** Get the overlay directory path */
    getOverlayDir(): string;
    /**
     * Resolve a read path: return overlay path if the file was previously written,
     * otherwise return the real path.
     */
    resolveReadPath(realPath: string): string;
    /**
     * Redirect a write to the overlay. On first write to a file, copies the
     * original to the overlay (if it exists). Returns the overlay path to write to.
     */
    redirectWrite(realPath: string): Promise<string>;
    /**
     * Get all files that were written to the overlay.
     */
    getWrittenFiles(): Map<string, string>;
    /**
     * Copy all overlay files back to the real filesystem.
     * Returns the list of real paths that were updated.
     */
    applyToReal(): Promise<string[]>;
    /**
     * Clean up the overlay directory.
     */
    cleanup(): Promise<void>;
    /**
     * Convert an absolute path to a relative path within cwd.
     * Returns null if the path is outside cwd.
     */
    private toRelative;
}
