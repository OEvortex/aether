/**
 * @license
 * Copyright 2026 OEvortex
 * SPDX-License-Identifier: Apache-2.0
 */
import { type Dispatcher } from 'undici';
/**
 * JavaScript runtime type
 */
export type Runtime = 'node' | 'bun' | 'unknown';
/**
 * Detect the current JavaScript runtime
 */
export declare function detectRuntime(): Runtime;
/**
 * Runtime fetch options for OpenAI SDK
 */
export type OpenAIRuntimeFetchOptions = {
    fetchOptions?: {
        dispatcher?: Dispatcher;
        timeout?: false;
    };
} | undefined;
/**
 * Runtime fetch options for Anthropic SDK
 */
export type AnthropicRuntimeFetchOptions = {
    fetchOptions?: {
        dispatcher?: Dispatcher;
    };
    fetch?: any;
};
/**
 * SDK type identifier
 */
export type SDKType = 'openai' | 'anthropic';
/**
 * Build runtime-specific fetch options for OpenAI SDK
 */
export declare function buildRuntimeFetchOptions(sdkType: 'openai', proxyUrl?: string): OpenAIRuntimeFetchOptions;
/**
 * Build runtime-specific fetch options for Anthropic SDK
 */
export declare function buildRuntimeFetchOptions(sdkType: 'anthropic', proxyUrl?: string): AnthropicRuntimeFetchOptions;
