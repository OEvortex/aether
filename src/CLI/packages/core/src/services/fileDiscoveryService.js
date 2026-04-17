/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as path from 'node:path';
import { AetherIgnoreParser } from '../utils/aetherIgnoreParser.js';
import { GitIgnoreParser } from '../utils/gitIgnoreParser.js';
import { isGitRepository } from '../utils/gitUtils.js';
export class FileDiscoveryService {
    gitIgnoreFilter = null;
    aetherIgnoreFilter = null;
    projectRoot;
    constructor(projectRoot) {
        this.projectRoot = path.resolve(projectRoot);
        if (isGitRepository(this.projectRoot)) {
            this.gitIgnoreFilter = new GitIgnoreParser(this.projectRoot);
        }
        this.aetherIgnoreFilter = new AetherIgnoreParser(this.projectRoot);
    }
    /**
     * Filters a list of file paths based on git ignore rules
     */
    filterFiles(filePaths, options = {
        respectGitIgnore: true,
        respectAetherIgnore: true
    }) {
        return filePaths.filter((filePath) => {
            if (options.respectGitIgnore &&
                this.shouldGitIgnoreFile(filePath)) {
                return false;
            }
            if (options.respectAetherIgnore &&
                this.shouldAetherIgnoreFile(filePath)) {
                return false;
            }
            return true;
        });
    }
    /**
     * Filters a list of file paths based on git ignore rules and returns a report
     * with counts of ignored files.
     */
    filterFilesWithReport(filePaths, opts = {
        respectGitIgnore: true,
        respectAetherIgnore: true
    }) {
        const filteredPaths = [];
        let gitIgnoredCount = 0;
        let aetherIgnoredCount = 0;
        for (const filePath of filePaths) {
            if (opts.respectGitIgnore && this.shouldGitIgnoreFile(filePath)) {
                gitIgnoredCount++;
                continue;
            }
            if (opts.respectAetherIgnore &&
                this.shouldAetherIgnoreFile(filePath)) {
                aetherIgnoredCount++;
                continue;
            }
            filteredPaths.push(filePath);
        }
        return {
            filteredPaths,
            gitIgnoredCount,
            aetherIgnoredCount
        };
    }
    /**
     * Checks if a single file should be git-ignored
     */
    shouldGitIgnoreFile(filePath) {
        if (this.gitIgnoreFilter) {
            return this.gitIgnoreFilter.isIgnored(filePath);
        }
        return false;
    }
    /**
     * Checks if a single file should be aether-ignored
     */
    shouldAetherIgnoreFile(filePath) {
        if (this.aetherIgnoreFilter) {
            return this.aetherIgnoreFilter.isIgnored(filePath);
        }
        return false;
    }
    /**
     * Unified method to check if a file should be ignored based on filtering options
     */
    shouldIgnoreFile(filePath, options = {}) {
        const { respectGitIgnore = true, respectAetherIgnore = true, respectQwenIgnore = true } = options;
        if (respectGitIgnore && this.shouldGitIgnoreFile(filePath)) {
            return true;
        }
        if ((respectAetherIgnore || respectQwenIgnore) &&
            this.shouldAetherIgnoreFile(filePath)) {
            return true;
        }
        return false;
    }
    /**
     * Returns loaded patterns from .aetherignore
     */
    getAetherIgnorePatterns() {
        return this.aetherIgnoreFilter?.getPatterns() ?? [];
    }
}
//# sourceMappingURL=fileDiscoveryService.js.map