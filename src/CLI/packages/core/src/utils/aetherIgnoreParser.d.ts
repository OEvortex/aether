/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface AetherIgnoreFilter {
    isIgnored(filePath: string): boolean;
    getPatterns(): string[];
}
export declare class AetherIgnoreParser implements AetherIgnoreFilter {
    private projectRoot;
    private patterns;
    private ig;
    constructor(projectRoot: string);
    private loadPatterns;
    isIgnored(filePath: string): boolean;
    getPatterns(): string[];
}
