/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import ignore from 'ignore';
export class AetherIgnoreParser {
    projectRoot;
    patterns = [];
    ig = ignore();
    constructor(projectRoot) {
        this.projectRoot = path.resolve(projectRoot);
        this.loadPatterns();
    }
    loadPatterns() {
        const patternsFilePath = path.join(this.projectRoot, '.aetherignore');
        let content;
        try {
            content = fs.readFileSync(patternsFilePath, 'utf-8');
        }
        catch (_error) {
            // ignore file not found
            return;
        }
        this.patterns = (content ?? '')
            .split('\n')
            .map((p) => p.trim())
            .filter((p) => p !== '' && !p.startsWith('#'));
        this.ig.add(this.patterns);
    }
    isIgnored(filePath) {
        if (this.patterns.length === 0) {
            return false;
        }
        if (!filePath || typeof filePath !== 'string') {
            return false;
        }
        if (filePath.startsWith('\\') ||
            filePath === '/' ||
            filePath.includes('\0')) {
            return false;
        }
        const resolved = path.resolve(this.projectRoot, filePath);
        const relativePath = path.relative(this.projectRoot, resolved);
        if (relativePath === '' || relativePath.startsWith('..')) {
            return false;
        }
        // Even in windows, Ignore expects forward slashes.
        const normalizedPath = relativePath.replace(/\\/g, '/');
        if (normalizedPath.startsWith('/') || normalizedPath === '') {
            return false;
        }
        return this.ig.ignores(normalizedPath);
    }
    getPatterns() {
        return this.patterns;
    }
}
//# sourceMappingURL=aetherIgnoreParser.js.map