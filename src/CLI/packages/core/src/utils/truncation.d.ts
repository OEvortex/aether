/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
/**
 * Truncates large tool output and saves the full content to a temp file.
 * Used by the shell tool to prevent excessively large outputs from being
 * sent to the LLM context.
 *
 * If content length is within the threshold, returns it unchanged.
 * Otherwise, saves full content to a file and returns a truncated version
 * with head/tail lines and a pointer to the saved file.
 */
export declare function truncateAndSaveToFile(content: string, fileName: string, projectTempDir: string, threshold: number, truncateLines: number): Promise<{
    content: string;
    outputFile?: string;
}>;
/**
 * High-level truncation helper that reads thresholds from Config,
 * truncates if needed, saves full output to a temp file, and logs
 * telemetry. Returns the (possibly truncated) content and an optional
 * output file path.
 *
 * Callers no longer need to duplicate config extraction, file naming,
 * or telemetry logging.
 */
export declare function truncateToolOutput(config: Config, toolName: string, content: string): Promise<{
    content: string;
    outputFile?: string;
}>;
