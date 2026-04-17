/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface UpdateSymlinkOptions {
    /**
     * When true, falls back to copying the file if symlinks are not
     * available (e.g. Windows without elevated privileges).
     * Disable this for targets that keep changing after creation (like log
     * files) where a one-time copy would be immediately stale.
     *
     * @default true
     */
    fallbackCopy?: boolean;
}
/**
 * Create or replace a symlink at {@link linkPath} pointing to
 * {@link targetPath}.
 *
 * The symlink uses a relative target so it stays valid even when the
 * parent directory is moved.
 *
 * All errors are swallowed — the operation is strictly best-effort.
 */
export declare function updateSymlink(linkPath: string, targetPath: string, options?: UpdateSymlinkOptions): Promise<void>;
