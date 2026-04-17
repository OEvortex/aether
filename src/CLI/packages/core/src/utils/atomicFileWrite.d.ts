/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
export interface AtomicWriteOptions {
    /** Number of rename retries on EPERM/EACCES (default: 3). */
    retries?: number;
    /** Base delay in ms for exponential backoff (default: 50). */
    delayMs?: number;
}
/**
 * Atomically write a JSON value to a file.
 *
 * Writes to a temporary file first, then renames it to the target path.
 * On POSIX `fs.rename` is atomic, so readers never see a partial file.
 * On Windows the rename can fail with EPERM under concurrent access,
 * so we retry with exponential backoff.
 *
 * The parent directory of `filePath` must already exist.
 */
export declare function atomicWriteJSON(filePath: string, data: unknown, options?: AtomicWriteOptions): Promise<void>;
