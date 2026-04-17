/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface GitIgnoreFilter {
    isIgnored(filePath: string): boolean;
}
export declare class GitIgnoreParser implements GitIgnoreFilter {
    private projectRoot;
    private cache;
    private globalPatterns;
    constructor(projectRoot: string);
    private loadPatternsForFile;
    isIgnored(filePath: string): boolean;
}
