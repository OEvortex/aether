/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface FileFilteringOptions {
    respectGitIgnore: boolean;
    respectAetherIgnore: boolean;
    respectQwenIgnore: boolean;
}
export declare const DEFAULT_MEMORY_FILE_FILTERING_OPTIONS: FileFilteringOptions;
export declare const DEFAULT_FILE_FILTERING_OPTIONS: FileFilteringOptions;
