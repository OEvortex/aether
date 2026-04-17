/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { PartUnion } from '@google/genai';
import type { Config } from '../config/config.js';
/**
 * Reads the content of a file or recursively expands a directory from
 * within the workspace, returning content suitable for LLM input.
 *
 * @param pathStr The path to read (can be absolute or relative).
 * @param config The application configuration, providing workspace context and services.
 * @returns A promise that resolves to an array of PartUnion (string | Part).
 * @throws An error if the path is not found or is outside the workspace.
 */
export declare function readPathFromWorkspace(pathStr: string, config: Config): Promise<PartUnion[]>;
