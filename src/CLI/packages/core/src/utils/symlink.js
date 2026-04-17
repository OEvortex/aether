/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
/**
 * Create or replace a symlink at {@link linkPath} pointing to
 * {@link targetPath}.
 *
 * The symlink uses a relative target so it stays valid even when the
 * parent directory is moved.
 *
 * All errors are swallowed — the operation is strictly best-effort.
 */
export async function updateSymlink(linkPath, targetPath, options) {
    const { fallbackCopy = true } = options ?? {};
    const linkDir = path.dirname(linkPath);
    const relativeTarget = path.relative(linkDir, targetPath);
    try {
        await fs.unlink(linkPath);
    }
    catch {
        // File doesn't exist, ignore
    }
    try {
        await fs.symlink(relativeTarget, linkPath);
        return;
    }
    catch {
        // Symlink not supported, try fallback
    }
    if (fallbackCopy) {
        try {
            await fs.copyFile(targetPath, linkPath);
        }
        catch {
            // Best-effort; swallow error
        }
    }
}
//# sourceMappingURL=symlink.js.map