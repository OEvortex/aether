/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getErrorMessage } from './errors.js';
import { processSingleFileContent } from './fileUtils.js';
import { getFolderStructure } from './getFolderStructure.js';
const DEFAULT_OUTPUT_HEADER = '\n--- Content from referenced files ---';
const DEFAULT_OUTPUT_TERMINATOR = '\n--- End of content ---';
/**
 * Reads content from multiple files and directories specified by paths.
 *
 * For directories, returns the folder structure.
 * For text files, concatenates their content into a single string with separators.
 * For image and PDF files, returns base64-encoded data.
 *
 * @param config - The runtime configuration
 * @param options - Options for file reading (paths, filters, signal)
 * @returns Result containing content parts and processed files
 *
 * NOTE: This utility is invoked only by explicit user-triggered file reads.
 * Do not apply workspace filters or path restrictions here.
 */
export async function readManyFiles(config, options) {
    const { paths: inputPatterns } = options;
    const seenFiles = new Set();
    const contentParts = [];
    const files = [];
    try {
        const projectRoot = config.getProjectRoot();
        for (const rawPattern of inputPatterns) {
            const normalizedPattern = rawPattern.replace(/\\/g, '/');
            const fullPath = path.resolve(projectRoot, normalizedPattern);
            const stats = fs.existsSync(fullPath)
                ? fs.statSync(fullPath)
                : null;
            if (stats?.isDirectory()) {
                const { contentParts: dirParts, info } = await readDirectory(config, fullPath);
                contentParts.push(...dirParts);
                files.push(info);
                continue;
            }
            if (stats?.isFile() && !seenFiles.has(fullPath)) {
                seenFiles.add(fullPath);
                const readResult = await readFileContent(config, fullPath);
                if (readResult) {
                    contentParts.push(...readResult.contentParts);
                    files.push(readResult.info);
                }
            }
        }
    }
    catch (error) {
        const errorMessage = `Error during file search: ${getErrorMessage(error)}`;
        return {
            contentParts: [errorMessage],
            files: [],
            error: errorMessage
        };
    }
    if (contentParts.length > 0) {
        contentParts.unshift({ text: DEFAULT_OUTPUT_HEADER });
        contentParts.push({ text: DEFAULT_OUTPUT_TERMINATOR });
    }
    else {
        contentParts.push({
            text: 'No files matching the criteria were found or all were skipped.'
        });
    }
    return { contentParts: contentParts, files };
}
async function readDirectory(config, directoryPath) {
    const structure = await getFolderStructure(directoryPath, {
        fileService: config.getFileService(),
        fileFilteringOptions: config.getFileFilteringOptions()
    });
    const contentParts = [
        { text: `\nContent from ${directoryPath}:\n` },
        { text: structure }
    ];
    return {
        contentParts,
        info: {
            filePath: directoryPath,
            content: structure,
            isDirectory: true
        }
    };
}
async function readFileContent(config, filePath) {
    try {
        const fileReadResult = await processSingleFileContent(filePath, config);
        if (fileReadResult.error) {
            return null;
        }
        const prefixText = { text: `\nContent from ${filePath}:\n` };
        if (typeof fileReadResult.llmContent === 'string') {
            let fileContentForLlm = '';
            if (fileReadResult.isTruncated) {
                const [start, end] = fileReadResult.linesShown;
                const total = fileReadResult.originalLineCount;
                fileContentForLlm = `Showing lines ${start}-${end} of ${total} total lines.\n---\n${fileReadResult.llmContent}`;
            }
            else {
                fileContentForLlm = fileReadResult.llmContent;
            }
            const contentParts = [
                prefixText,
                { text: fileContentForLlm }
            ];
            return {
                contentParts,
                info: {
                    filePath,
                    content: fileContentForLlm,
                    isDirectory: false
                }
            };
        }
        // For binary files (images, PDFs), add prefix text before the inlineData/fileData part
        const contentParts = [prefixText, fileReadResult.llmContent];
        return {
            contentParts,
            info: {
                filePath,
                content: fileReadResult.llmContent,
                isDirectory: false
            }
        };
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=readManyFiles.js.map