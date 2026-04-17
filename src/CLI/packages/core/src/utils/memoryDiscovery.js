/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as fsSync from 'node:fs';
import * as fs from 'node:fs/promises';
import { homedir } from 'node:os';
import * as path from 'node:path';
import { getAllGeminiMdFilenames } from '../tools/memoryTool.js';
import { createDebugLogger } from './debugLogger.js';
import { processImports } from './memoryImportProcessor.js';
import { AETHER_DIR } from './paths.js';
const logger = createDebugLogger('MEMORY_DISCOVERY');
async function findProjectRoot(startDir) {
    let currentDir = path.resolve(startDir);
    while (true) {
        const gitPath = path.join(currentDir, '.git');
        try {
            const stats = await fs.lstat(gitPath);
            if (stats.isDirectory()) {
                return currentDir;
            }
        }
        catch (error) {
            // Don't log ENOENT errors as they're expected when .git doesn't exist
            // Also don't log errors in test environments, which often have mocked fs
            const isENOENT = typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                error.code === 'ENOENT';
            // Only log unexpected errors in non-test environments
            // process.env['NODE_ENV'] === 'test' or VITEST are common test indicators
            const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST;
            if (!isENOENT && !isTestEnv) {
                if (typeof error === 'object' &&
                    error !== null &&
                    'code' in error) {
                    const fsError = error;
                    logger.warn(`Error checking for .git directory at ${gitPath}: ${fsError.message}`);
                }
                else {
                    logger.warn(`Non-standard error checking for .git directory at ${gitPath}: ${String(error)}`);
                }
            }
        }
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
            return null;
        }
        currentDir = parentDir;
    }
}
async function getGeminiMdFilePathsInternal(currentWorkingDirectory, includeDirectoriesToReadGemini, userHomePath, fileService, extensionContextFilePaths = [], folderTrust) {
    const dirs = new Set([
        ...includeDirectoriesToReadGemini,
        currentWorkingDirectory
    ]);
    // Process directories in parallel with concurrency limit to prevent EMFILE errors
    const CONCURRENT_LIMIT = 10;
    const dirsArray = Array.from(dirs);
    const pathsArrays = [];
    for (let i = 0; i < dirsArray.length; i += CONCURRENT_LIMIT) {
        const batch = dirsArray.slice(i, i + CONCURRENT_LIMIT);
        const batchPromises = batch.map((dir) => getGeminiMdFilePathsInternalForEachDir(dir, userHomePath, fileService, extensionContextFilePaths, folderTrust));
        const batchResults = await Promise.allSettled(batchPromises);
        for (const result of batchResults) {
            if (result.status === 'fulfilled') {
                pathsArrays.push(result.value);
            }
            else {
                const error = result.reason;
                const message = error instanceof Error ? error.message : String(error);
                logger.error(`Error discovering files in directory: ${message}`);
                // Continue processing other directories
            }
        }
    }
    const paths = pathsArrays.flat();
    return Array.from(new Set(paths));
}
async function getGeminiMdFilePathsInternalForEachDir(dir, userHomePath, _fileService, extensionContextFilePaths = [], folderTrust) {
    const allPaths = new Set();
    const geminiMdFilenames = getAllGeminiMdFilenames();
    for (const geminiMdFilename of geminiMdFilenames) {
        const resolvedHome = path.resolve(userHomePath);
        const globalMemoryPath = path.join(resolvedHome, AETHER_DIR, geminiMdFilename);
        // This part that finds the global file always runs.
        try {
            await fs.access(globalMemoryPath, fsSync.constants.R_OK);
            allPaths.add(globalMemoryPath);
            logger.debug(`Found readable global ${geminiMdFilename}: ${globalMemoryPath}`);
        }
        catch {
            // It's okay if it's not found.
        }
        // Handle the case where we're in the home directory (dir is empty string or home path)
        const resolvedDir = dir ? path.resolve(dir) : resolvedHome;
        const isHomeDirectory = resolvedDir === resolvedHome;
        if (isHomeDirectory) {
            // For home directory, only check for AGENTS.md directly in the home directory
            const homeContextPath = path.join(resolvedHome, geminiMdFilename);
            try {
                await fs.access(homeContextPath, fsSync.constants.R_OK);
                if (homeContextPath !== globalMemoryPath) {
                    allPaths.add(homeContextPath);
                    logger.debug(`Found readable home ${geminiMdFilename}: ${homeContextPath}`);
                }
            }
            catch {
                // Not found, which is okay
            }
        }
        else if (dir && folderTrust) {
            // FIX: Only perform the workspace search (upward scan from CWD to project root)
            // if a valid currentWorkingDirectory is provided and it's not the home directory.
            const resolvedCwd = path.resolve(dir);
            logger.debug(`Searching for ${geminiMdFilename} starting from CWD: ${resolvedCwd}`);
            const projectRoot = await findProjectRoot(resolvedCwd);
            logger.debug(`Determined project root: ${projectRoot ?? 'None'}`);
            const upwardPaths = [];
            let currentDir = resolvedCwd;
            const ultimateStopDir = projectRoot
                ? path.dirname(projectRoot)
                : path.dirname(resolvedHome);
            while (currentDir && currentDir !== path.dirname(currentDir)) {
                if (currentDir === path.join(resolvedHome, AETHER_DIR)) {
                    break;
                }
                const potentialPath = path.join(currentDir, geminiMdFilename);
                try {
                    await fs.access(potentialPath, fsSync.constants.R_OK);
                    if (potentialPath !== globalMemoryPath) {
                        upwardPaths.unshift(potentialPath);
                    }
                }
                catch {
                    // Not found, continue.
                }
                if (currentDir === ultimateStopDir) {
                    break;
                }
                currentDir = path.dirname(currentDir);
            }
            upwardPaths.forEach((p) => allPaths.add(p));
        }
    }
    // Add extension context file paths.
    for (const extensionPath of extensionContextFilePaths) {
        allPaths.add(extensionPath);
    }
    const finalPaths = Array.from(allPaths);
    logger.debug(`Final ordered ${getAllGeminiMdFilenames()} paths to read: ${JSON.stringify(finalPaths)}`);
    return finalPaths;
}
async function readGeminiMdFiles(filePaths, importFormat = 'tree') {
    // Process files in parallel with concurrency limit to prevent EMFILE errors
    const CONCURRENT_LIMIT = 20; // Higher limit for file reads as they're typically faster
    const results = [];
    for (let i = 0; i < filePaths.length; i += CONCURRENT_LIMIT) {
        const batch = filePaths.slice(i, i + CONCURRENT_LIMIT);
        const batchPromises = batch.map(async (filePath) => {
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                // Process imports in the content
                const processedResult = await processImports(content, path.dirname(filePath), undefined, undefined, importFormat);
                logger.debug(`Successfully read and processed imports: ${filePath} (Length: ${processedResult.content.length})`);
                return { filePath, content: processedResult.content };
            }
            catch (error) {
                const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST;
                if (!isTestEnv) {
                    const message = error instanceof Error
                        ? error.message
                        : String(error);
                    logger.warn(`Warning: Could not read ${getAllGeminiMdFilenames()} file at ${filePath}. Error: ${message}`);
                }
                logger.debug(`Failed to read: ${filePath}`);
                return { filePath, content: null }; // Still include it with null content
            }
        });
        const batchResults = await Promise.allSettled(batchPromises);
        for (const result of batchResults) {
            if (result.status === 'fulfilled') {
                results.push(result.value);
            }
            else {
                // This case shouldn't happen since we catch all errors above,
                // but handle it for completeness
                const error = result.reason;
                const message = error instanceof Error ? error.message : String(error);
                logger.error(`Unexpected error processing file: ${message}`);
            }
        }
    }
    return results;
}
function concatenateInstructions(instructionContents, 
// CWD is needed to resolve relative paths for display markers
currentWorkingDirectoryForDisplay) {
    return instructionContents
        .filter((item) => typeof item.content === 'string')
        .map((item) => {
        const trimmedContent = item.content.trim();
        if (trimmedContent.length === 0) {
            return null;
        }
        const displayPath = path.isAbsolute(item.filePath)
            ? path.relative(currentWorkingDirectoryForDisplay, item.filePath)
            : item.filePath;
        return `--- Context from: ${displayPath} ---\n${trimmedContent}\n--- End of Context from: ${displayPath} ---`;
    })
        .filter((block) => block !== null)
        .join('\n\n');
}
/**
 * Loads hierarchical AGENTS.md files and concatenates their content.
 * This function is intended for use by the server.
 */
export async function loadServerHierarchicalMemory(currentWorkingDirectory, includeDirectoriesToReadGemini, fileService, extensionContextFilePaths = [], folderTrust, importFormat = 'tree') {
    logger.debug(`Loading server hierarchical memory for CWD: ${currentWorkingDirectory} (importFormat: ${importFormat})`);
    // For the server, homedir() refers to the server process's home.
    // This is consistent with how MemoryTool already finds the global path.
    const userHomePath = homedir();
    const filePaths = await getGeminiMdFilePathsInternal(currentWorkingDirectory, includeDirectoriesToReadGemini, userHomePath, fileService, extensionContextFilePaths, folderTrust);
    if (filePaths.length === 0) {
        logger.debug('No AGENTS.md files found in hierarchy.');
        return { memoryContent: '', fileCount: 0 };
    }
    const contentsWithPaths = await readGeminiMdFiles(filePaths, importFormat);
    // Pass CWD for relative path display in concatenated content
    const combinedInstructions = concatenateInstructions(contentsWithPaths, currentWorkingDirectory);
    // Only count files that match configured memory filenames (e.g., AGENTS.md),
    // excluding system context files like output-language.md
    const memoryFilenames = new Set(getAllGeminiMdFilenames());
    const fileCount = contentsWithPaths.filter((item) => memoryFilenames.has(path.basename(item.filePath))).length;
    return {
        memoryContent: combinedInstructions,
        fileCount // Only count the context files
    };
}
//# sourceMappingURL=memoryDiscovery.js.map