/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import type { AuthType } from '../core/contentGenerator.js';
export interface ParsedSubagentModelSelection {
    authType?: AuthType;
    modelId?: string;
    inherits: boolean;
}
/**
 * Parse a subagent model selector.
 *
 * Supported forms:
 * - omitted / inherit -> use parent conversation model
 * - modelId -> use parent authType with the provided modelId
 * - authType:modelId -> use explicit authType and modelId
 */
export declare function parseSubagentModelSelection(model: string | undefined): ParsedSubagentModelSelection;
