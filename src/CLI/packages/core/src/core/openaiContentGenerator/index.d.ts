/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../../config/config.js';
import type { ContentGenerator, ContentGeneratorConfig } from '../contentGenerator.js';
import { type OpenAICompatibleProvider } from './provider/index.js';
export { OpenAIContentConverter } from './converter.js';
export { OpenAIContentGenerator } from './openaiContentGenerator.js';
export { ContentGenerationPipeline, type PipelineConfig } from './pipeline.js';
export { DashScopeOpenAICompatibleProvider, DeepSeekOpenAICompatibleProvider, type OpenAICompatibleProvider, OpenRouterOpenAICompatibleProvider } from './provider/index.js';
/**
 * Create an OpenAI-compatible content generator with the appropriate provider
 */
export declare function createOpenAIContentGenerator(contentGeneratorConfig: ContentGeneratorConfig, cliConfig: Config): ContentGenerator;
/**
 * Determine the appropriate provider based on configuration
 */
export declare function determineProvider(contentGeneratorConfig: ContentGeneratorConfig, cliConfig: Config): OpenAICompatibleProvider;
export { EnhancedErrorHandler, type ErrorHandler } from './errorHandler.js';
