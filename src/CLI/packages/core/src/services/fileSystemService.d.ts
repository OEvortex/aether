/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ReadTextFileRequest, WriteTextFileRequest, WriteTextFileResponse } from '@agentclientprotocol/sdk';
export type LineEnding = 'crlf' | 'lf';
export type ReadTextFileResponse = {
    content: string;
    _meta?: {
        bom?: boolean;
        encoding?: string;
        originalLineCount?: number;
        lineEnding?: LineEnding;
    };
};
/**
 * Supported file encodings for new files.
 */
export declare const FileEncoding: {
    readonly UTF8: "utf-8";
    readonly UTF8_BOM: "utf-8-bom";
};
/**
 * Type for file encoding values.
 */
export type FileEncodingType = (typeof FileEncoding)[keyof typeof FileEncoding];
/**
 * Interface for file system operations that may be delegated to different implementations
 */
export interface FileSystemService {
    readTextFile(params: Omit<ReadTextFileRequest, 'sessionId'>): Promise<ReadTextFileResponse>;
    writeTextFile(params: Omit<WriteTextFileRequest, 'sessionId'>): Promise<WriteTextFileResponse>;
    /**
     * Finds files with a given name within specified search paths.
     *
     * @param fileName - The name of the file to find.
     * @param searchPaths - An array of directory paths to search within.
     * @returns An array of absolute paths to the found files.
     */
    findFiles(fileName: string, searchPaths: readonly string[]): string[];
}
/**
 * Options for writing text files
 */
export interface WriteTextFileOptions {
    /**
     * Whether to write the file with UTF-8 BOM.
     * If true, EF BB BF will be prepended to the content.
     * @default false
     */
    bom?: boolean;
    /**
     * The encoding to use when writing the file.
     * If specified and not UTF-8 compatible, iconv-lite will be used to encode.
     * This is used to preserve the original encoding of non-UTF-8 files (e.g. GBK, Big5).
     * @default undefined (writes as UTF-8)
     */
    encoding?: string;
}
/**
 * Returns true if a newly created file at the given path should be written
 * with a UTF-8 BOM. Conditions (all must be true):
 * 1. Running on Windows
 * 2. System code page is not UTF-8
 * 3. File extension is in UTF8_BOM_EXTENSIONS (e.g. .ps1)
 */
export declare function needsUtf8Bom(filePath: string): boolean;
/**
 * Reset the UTF-8 BOM cache — useful for testing.
 */
export declare function resetUtf8BomCache(): void;
/**
 * Ensures content uses CRLF line endings. First normalizes any existing
 * CRLF to LF to avoid double-conversion, then converts all LF to CRLF.
 */
export declare function ensureCrlfLineEndings(content: string): string;
/**
 * Detects whether the content uses CRLF or LF line endings.
 * Returns 'crlf' if the content contains at least one CRLF sequence,
 * 'lf' otherwise (including for content with no line endings).
 */
export declare function detectLineEnding(content: string): LineEnding;
/**
 * Standard file system implementation
 */
export declare class StandardFileSystemService implements FileSystemService {
    readTextFile(params: Omit<ReadTextFileRequest, 'sessionId'>): Promise<ReadTextFileResponse>;
    writeTextFile(params: Omit<WriteTextFileRequest, 'sessionId'>): Promise<WriteTextFileResponse>;
    findFiles(fileName: string, searchPaths: readonly string[]): string[];
}
