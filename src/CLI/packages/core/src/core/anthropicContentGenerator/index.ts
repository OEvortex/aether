/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Config } from '../../config/config.js';
import type {
    ContentGenerator,
    ContentGeneratorConfig
} from '../contentGenerator.js';
import { AnthropicContentGenerator } from './anthropicContentGenerator.js';

export { AnthropicContentGenerator } from './anthropicContentGenerator.js';

export function createAnthropicContentGenerator(
    contentGeneratorConfig: ContentGeneratorConfig,
    cliConfig: Config
): ContentGenerator {
    return new AnthropicContentGenerator(contentGeneratorConfig, cliConfig);
}
