/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Ignore } from './ignore.js';
export interface CrawlOptions {
    crawlDirectory: string;
    cwd: string;
    maxDepth?: number;
    ignore: Ignore;
    cache: boolean;
    cacheTtl: number;
}
export declare function crawl(options: CrawlOptions): Promise<string[]>;
