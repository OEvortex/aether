/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../../config/config.js';
import type { ContentGenerator, ContentGeneratorConfig } from '../contentGenerator.js';
export { GeminiContentGenerator } from './geminiContentGenerator.js';
/**
 * Create a Gemini content generator.
 */
export declare function createGeminiContentGenerator(config: ContentGeneratorConfig, gcConfig: Config): ContentGenerator;
