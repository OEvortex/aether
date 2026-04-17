/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Traverses up the process tree to find the process ID and command of the IDE.
 *
 * This function uses different strategies depending on the operating system
 * to identify the main application process (e.g., the main VS Code window
 * process).
 *
 * If the IDE process cannot be reliably identified, it will return the
 * top-level ancestor process ID and command as a fallback.
 *
 * @returns A promise that resolves to the PID and command of the IDE process.
 */
export declare function getIdeProcessInfo(): Promise<{
    pid: number;
    command: string;
}>;
