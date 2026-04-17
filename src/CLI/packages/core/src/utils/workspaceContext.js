/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';
import { isNodeError } from '../utils/errors.js';
import { createDebugLogger } from './debugLogger.js';
const debugLogger = createDebugLogger('WORKSPACE');
/**
 * WorkspaceContext manages multiple workspace directories and validates paths
 * against them. This allows the CLI to operate on files from multiple directories
 * in a single session.
 */
export class WorkspaceContext {
    directories = new Set();
    initialDirectories;
    onDirectoriesChangedListeners = new Set();
    /**
     * Creates a new WorkspaceContext with the given initial directory and optional additional directories.
     * @param directory The initial working directory (usually cwd)
     * @param additionalDirectories Optional array of additional directories to include
     */
    constructor(directory, additionalDirectories = []) {
        this.addDirectory(directory);
        // Snapshot only the primary working directory as "initial" (non-removable).
        // Additional directories (from settings / CLI flags) are added after
        // the snapshot so they remain removable by the user.
        this.initialDirectories = new Set(this.directories);
        for (const additionalDirectory of additionalDirectories) {
            this.addDirectory(additionalDirectory);
        }
    }
    /**
     * Registers a listener that is called when the workspace directories change.
     * @param listener The listener to call.
     * @returns A function to unsubscribe the listener.
     */
    onDirectoriesChanged(listener) {
        this.onDirectoriesChangedListeners.add(listener);
        return () => {
            this.onDirectoriesChangedListeners.delete(listener);
        };
    }
    notifyDirectoriesChanged() {
        // Iterate over a copy of the set in case a listener unsubscribes itself or others.
        for (const listener of [...this.onDirectoriesChangedListeners]) {
            try {
                listener();
            }
            catch (e) {
                // Don't let one listener break others.
                debugLogger.error('Error in WorkspaceContext listener:', e);
            }
        }
    }
    /**
     * Adds a directory to the workspace.
     * @param directory The directory path to add (can be relative or absolute)
     * @param basePath Optional base path for resolving relative paths (defaults to cwd)
     */
    addDirectory(directory, basePath = process.cwd()) {
        try {
            const resolved = this.resolveAndValidateDir(directory, basePath);
            if (this.directories.has(resolved)) {
                return;
            }
            this.directories.add(resolved);
            this.notifyDirectoriesChanged();
        }
        catch (err) {
            debugLogger.warn(`Skipping unreadable directory: ${directory} (${err instanceof Error ? err.message : String(err)})`);
        }
    }
    resolveAndValidateDir(directory, basePath = process.cwd()) {
        const absolutePath = path.isAbsolute(directory)
            ? directory
            : path.resolve(basePath, directory);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Directory does not exist: ${absolutePath}`);
        }
        const stats = fs.statSync(absolutePath);
        if (!stats.isDirectory()) {
            throw new Error(`Path is not a directory: ${absolutePath}`);
        }
        return fs.realpathSync(absolutePath);
    }
    /**
     * Gets a copy of all workspace directories.
     * @returns Array of absolute directory paths
     */
    getDirectories() {
        return Array.from(this.directories);
    }
    getInitialDirectories() {
        return Array.from(this.initialDirectories);
    }
    /**
     * Removes a directory from the workspace.
     * Cannot remove initial directories (those set at construction time).
     * @param directory The directory path to remove
     * @returns True if the directory was removed, false if not found or is an initial directory
     */
    removeDirectory(directory) {
        // Resolve to match the stored form
        let resolved;
        try {
            resolved = this.resolveAndValidateDir(directory);
        }
        catch {
            // If we can't resolve it, try matching by raw string (e.g. directory was deleted)
            resolved = path.isAbsolute(directory)
                ? directory
                : path.resolve(process.cwd(), directory);
        }
        if (this.initialDirectories.has(resolved)) {
            debugLogger.warn(`Cannot remove initial directory: ${resolved}`);
            return false;
        }
        if (!this.directories.has(resolved)) {
            return false;
        }
        this.directories.delete(resolved);
        this.notifyDirectoriesChanged();
        return true;
    }
    /**
     * Checks whether a directory is an initial (non-removable) directory.
     */
    isInitialDirectory(directory) {
        try {
            const resolved = this.resolveAndValidateDir(directory);
            return this.initialDirectories.has(resolved);
        }
        catch {
            const absolutePath = path.isAbsolute(directory)
                ? directory
                : path.resolve(process.cwd(), directory);
            return this.initialDirectories.has(absolutePath);
        }
    }
    setDirectories(directories) {
        const newDirectories = new Set();
        for (const dir of directories) {
            newDirectories.add(this.resolveAndValidateDir(dir));
        }
        if (newDirectories.size !== this.directories.size ||
            ![...newDirectories].every((d) => this.directories.has(d))) {
            this.directories = newDirectories;
            this.notifyDirectoriesChanged();
        }
    }
    /**
     * Checks if a given path is within any of the workspace directories.
     * @param pathToCheck The path to validate
     * @returns True if the path is within the workspace, false otherwise
     */
    isPathWithinWorkspace(pathToCheck) {
        try {
            const fullyResolvedPath = this.fullyResolvedPath(pathToCheck);
            for (const dir of this.directories) {
                if (isPathWithinRoot(fullyResolvedPath, dir)) {
                    return true;
                }
            }
            return false;
        }
        catch (_error) {
            return false;
        }
    }
    /**
     * Fully resolves a path, including symbolic links.
     * If the path does not exist, it returns the fully resolved path as it would be
     * if it did exist.
     */
    fullyResolvedPath(pathToCheck) {
        try {
            return fs.realpathSync(pathToCheck);
        }
        catch (e) {
            if (isNodeError(e) &&
                e.code === 'ENOENT' &&
                e.path &&
                // realpathSync does not set e.path correctly for symlinks to
                // non-existent files.
                !this.isFileSymlink(e.path)) {
                // If it doesn't exist, e.path contains the fully resolved path.
                return e.path;
            }
            throw e;
        }
    }
    /**
     * Checks if a file path is a symbolic link that points to a file.
     */
    isFileSymlink(filePath) {
        try {
            return !fs.readlinkSync(filePath).endsWith('/');
        }
        catch (_error) {
            return false;
        }
    }
}
/**
 * Checks if a path is within a given root directory.
 * @param pathToCheck The absolute path to check
 * @param rootDirectory The absolute root directory
 * @returns True if the path is within the root directory, false otherwise
 */
export function isPathWithinRoot(pathToCheck, rootDirectory) {
    const relative = path.relative(rootDirectory, pathToCheck);
    return (!relative.startsWith(`..${path.sep}`) &&
        relative !== '..' &&
        !path.isAbsolute(relative));
}
//# sourceMappingURL=workspaceContext.js.map