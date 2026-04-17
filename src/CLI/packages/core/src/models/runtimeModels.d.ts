/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ModelProvidersConfig } from './types.js';
export declare function discoverRuntimeModelProviders(modelProvidersConfig: ModelProvidersConfig | undefined, env: Record<string, string | undefined>, fallbackApiKey?: string): Promise<ModelProvidersConfig | undefined>;
