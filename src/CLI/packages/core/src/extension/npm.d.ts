/**
 * npm registry support for extension installation and updates.
 */
import type { ExtensionInstallMetadata } from '../config/config.js';
import { ExtensionUpdateState } from './extensionManager.js';
export interface NpmDownloadResult {
    version: string;
    type: 'npm';
}
/**
 * Parse a scoped npm package source string into name and optional version.
 * Examples:
 *   "@ali/openclaw-tmcp-dingtalk" → { name: "@ali/openclaw-tmcp-dingtalk" }
 *   "@ali/openclaw-tmcp-dingtalk@1.2.0" → { name: "@ali/openclaw-tmcp-dingtalk", version: "1.2.0" }
 *   "@ali/openclaw-tmcp-dingtalk@latest" → { name: "@ali/openclaw-tmcp-dingtalk", version: "latest" }
 */
export declare function parseNpmPackageSource(source: string): {
    name: string;
    version?: string;
};
/**
 * Check if a string looks like a scoped npm package.
 */
export declare function isScopedNpmPackage(source: string): boolean;
/**
 * Resolve the npm registry URL for a scoped package.
 *
 * Priority:
 * 1. Explicit CLI override (registryOverride parameter)
 * 2. Scoped registry from .npmrc (e.g. @ali:registry=https://...)
 * 3. Default registry from .npmrc
 * 4. Fallback: https://registry.npmjs.org/
 */
export declare function resolveNpmRegistry(scope: string, registryOverride?: string): string;
/**
 * Download and extract an extension from an npm registry.
 */
export declare function downloadFromNpmRegistry(installMetadata: ExtensionInstallMetadata, destination: string): Promise<NpmDownloadResult>;
/**
 * Check if an npm-installed extension has an update available.
 */
export declare function checkNpmUpdate(installMetadata: ExtensionInstallMetadata): Promise<ExtensionUpdateState>;
