/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Content } from '@google/genai';
export declare function isFunctionResponse(content: Content): boolean;
export declare function isFunctionCall(content: Content): boolean;
