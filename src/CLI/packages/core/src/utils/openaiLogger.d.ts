/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Logger specifically for OpenAI API requests and responses
 */
export declare class OpenAILogger {
    private logDir;
    private initialized;
    /**
     * Creates a new OpenAI logger
     * @param customLogDir Optional custom log directory path (supports relative paths, absolute paths, and ~ expansion)
     * @param cwd Optional working directory for resolving relative paths. Defaults to process.cwd().
     *            In ACP mode, process.cwd() may be '/' (filesystem root), so callers should
     *            pass the project working directory from Config.getWorkingDir().
     */
    constructor(customLogDir?: string, cwd?: string);
    /**
     * Initialize the logger by creating the log directory if it doesn't exist
     */
    initialize(): Promise<void>;
    /**
     * Logs an OpenAI API request and its response
     * @param request The request sent to OpenAI
     * @param response The response received from OpenAI
     * @param error Optional error if the request failed
     * @returns The file path where the log was written
     */
    logInteraction(request: unknown, response?: unknown, error?: Error): Promise<string>;
    /**
     * Get all logged interactions
     * @param limit Optional limit on the number of log files to return (sorted by most recent first)
     * @returns Array of log file paths
     */
    getLogFiles(limit?: number): Promise<string[]>;
    /**
     * Read a specific log file
     * @param filePath The path to the log file
     * @returns The log file content
     */
    readLogFile(filePath: string): Promise<unknown>;
}
export declare const openaiLogger: OpenAILogger;
