/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Reads the first N lines from a JSONL file efficiently.
 * Returns an array of parsed objects.
 */
export declare function readLines<T = unknown>(filePath: string, count: number): Promise<T[]>;
/**
 * Reads all lines from a JSONL file.
 * Returns an array of parsed objects.
 */
export declare function read<T = unknown>(filePath: string): Promise<T[]>;
/**
 * Appends a line to a JSONL file with concurrency control.
 * This method uses a mutex to ensure only one write happens at a time per file.
 */
export declare function writeLine(filePath: string, data: unknown): Promise<void>;
/**
 * Synchronous version of writeLine for use in non-async contexts.
 * Uses a simple flag-based locking mechanism (less robust than async version).
 */
export declare function writeLineSync(filePath: string, data: unknown): void;
/**
 * Overwrites a JSONL file with an array of objects.
 * Each object will be written as a separate line.
 */
export declare function write(filePath: string, data: unknown[]): void;
/**
 * Counts the number of non-empty lines in a JSONL file.
 */
export declare function countLines(filePath: string): Promise<number>;
/**
 * Checks if a JSONL file exists and is not empty.
 */
export declare function exists(filePath: string): boolean;
