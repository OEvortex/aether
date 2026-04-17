/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Diff from 'diff';
import type { DiffStat } from './tools.js';
export declare const DEFAULT_DIFF_OPTIONS: Diff.PatchOptions;
export declare function getDiffStat(fileName: string, oldStr: string, aiStr: string, userStr: string): DiffStat;
