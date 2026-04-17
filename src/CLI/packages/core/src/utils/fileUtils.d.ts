/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { PartUnion } from '@google/genai';
import type { Config } from '../config/config.js';
import { ToolErrorType } from '../tools/tool-error.js';
export declare const DEFAULT_ENCODING: BufferEncoding;
type UnicodeEncoding = 'utf8' | 'utf16le' | 'utf16be' | 'utf32le' | 'utf32be';
interface BOMInfo {
    encoding: UnicodeEncoding;
    bomLength: number;
}
/**
 * Detect a Unicode BOM (Byte Order Mark) if present.
 * Reads up to the first 4 bytes and returns encoding + BOM length, else null.
 */
export declare function detectBOM(buf: Buffer): BOMInfo | null;
/**
 * Result of reading a file with encoding detection.
 */
export interface FileReadResult {
    /** Decoded text content of the file (BOM stripped if present). */
    content: string;
    /** Detected encoding name (e.g. 'utf-8', 'gb18030', 'utf-16le'). */
    encoding: string;
    /**
     * Whether the file had a Unicode BOM (UTF-8, UTF-16 LE/BE, or UTF-32 LE/BE).
     * When true, the same BOM should be re-written on save to preserve the file's
     * original byte-order mark.
     */
    bom: boolean;
}
/**
 * Read a file as text, honoring BOM encodings (UTF‑8/16/32) and stripping the BOM.
 * For files without BOM, validates UTF-8 first. If invalid UTF-8, uses chardet
 * to detect encoding (e.g. GBK, Big5, Shift_JIS) and iconv-lite to decode.
 * Falls back to utf8 when detection fails.
 *
 * Returns both the decoded content and the detected encoding/BOM information
 * in a single I/O pass, avoiding redundant file reads.
 */
export declare function readFileWithEncodingInfo(filePath: string): Promise<FileReadResult>;
/**
 * Read a file as text, honoring BOM encodings (UTF‑8/16/32) and stripping the BOM.
 * For files without BOM, validates UTF-8 first. If invalid UTF-8, uses chardet
 * to detect encoding (e.g. GBK, Big5, Shift_JIS) and iconv-lite to decode.
 * Falls back to utf8 when detection fails.
 */
export declare function readFileWithEncoding(filePath: string): Promise<string>;
export declare function countFileLines(filePath: string): Promise<number>;
export declare function readFileWithLineAndLimit(params: {
    path: string;
    limit: number;
    line?: number;
}): Promise<{
    content: string;
    bom?: boolean;
    encoding?: string;
    originalLineCount: number;
}>;
/**
 * Detect the encoding of a file by reading a sample from its beginning.
 * Returns the encoding name (e.g. 'utf-8', 'gbk', 'shift_jis').
 * Uses BOM detection first, then UTF-8 validation, then chardet as fallback.
 */
export declare function detectFileEncoding(filePath: string): Promise<string>;
/**
 * Looks up the specific MIME type for a file path.
 * @param filePath Path to the file.
 * @returns The specific MIME type string (e.g., 'text/python', 'application/javascript') or undefined if not found or ambiguous.
 */
export declare function getSpecificMimeType(filePath: string): string | undefined;
/**
 * Checks if a path is within a given root directory.
 * @param pathToCheck The absolute path to check.
 * @param rootDirectory The absolute root directory.
 * @returns True if the path is within the root directory, false otherwise.
 */
export declare function isWithinRoot(pathToCheck: string, rootDirectory: string): boolean;
/**
 * Heuristic: determine if a file is likely binary.
 * Now BOM-aware: if a Unicode BOM is detected, we treat it as text.
 * For non-BOM files, retain the existing null-byte and non-printable ratio checks.
 */
export declare function isBinaryFile(filePath: string): Promise<boolean>;
/**
 * Detects the type of file based on extension and content.
 * @param filePath Path to the file.
 * @returns Promise that resolves to 'text', 'image', 'pdf', 'audio', 'video', 'binary' or 'svg'.
 */
export declare function detectFileType(filePath: string): Promise<'text' | 'image' | 'pdf' | 'audio' | 'video' | 'binary' | 'svg'>;
export interface ProcessedFileReadResult {
    llmContent: PartUnion;
    returnDisplay: string;
    error?: string;
    errorType?: ToolErrorType;
    originalLineCount?: number;
    isTruncated?: boolean;
    linesShown?: [number, number];
}
/**
 * Reads and processes a single file, handling text, images, and PDFs.
 * @param filePath Absolute path to the file.
 * @param config Config instance for truncation settings.
 * @param offset Optional offset for text files (0-based line number).
 * @param limit Optional limit for text files (number of lines to read).
 * @returns ProcessedFileReadResult object.
 */
export declare function processSingleFileContent(filePath: string, config: Config, offset?: number, limit?: number): Promise<ProcessedFileReadResult>;
export declare function fileExists(filePath: string): Promise<boolean>;
export {};
