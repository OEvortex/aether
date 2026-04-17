/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ExtensionInstallMetadata } from '../config/config.js';
import type { ExtensionConfig } from './extensionManager.js';
export interface MarketplaceInstallOptions {
    marketplaceUrl: string;
    pluginName: string;
    tempDir: string;
    requestConsent: (consent: string) => Promise<boolean>;
}
export interface MarketplaceInstallResult {
    config: ExtensionConfig;
    sourcePath: string;
    installMetadata: ExtensionInstallMetadata;
}
export declare function parseInstallSource(source: string): Promise<ExtensionInstallMetadata>;
