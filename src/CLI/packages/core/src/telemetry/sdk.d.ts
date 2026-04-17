/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
export declare function isTelemetrySdkInitialized(): boolean;
export declare function initializeTelemetry(config: Config): void;
export declare function shutdownTelemetry(): Promise<void>;
