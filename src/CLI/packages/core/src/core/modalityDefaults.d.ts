/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import type { InputModalities } from './contentGenerator.js';
/**
 * Return the default input modalities for a model based on its name.
 *
 * Uses the same normalize-then-regex pattern as {@link tokenLimit}.
 * Unknown models default to text-only (empty object) to avoid sending
 * unsupported media types that would cause unrecoverable API errors.
 */
export declare function defaultModalities(model: string): InputModalities;
