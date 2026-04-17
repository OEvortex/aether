/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { ExtensionInstallMetadata } from '../config/config.js';
import { type Extension, type ExtensionManager, ExtensionUpdateState } from './extensionManager.js';
interface Asset {
    name: string;
    browser_download_url: string;
}
export interface GitHubDownloadResult {
    tagName: string;
    type: 'git' | 'github-release';
}
/**
 * Clones a Git repository to a specified local path.
 * @param installMetadata The metadata for the extension to install.
 * @param destination The destination path to clone the repository to.
 */
export declare function cloneFromGit(installMetadata: ExtensionInstallMetadata, destination: string): Promise<void>;
export declare function parseGitHubRepoForReleases(source: string): {
    owner: string;
    repo: string;
};
export declare function checkForExtensionUpdate(extension: Extension, extensionManager: ExtensionManager): Promise<ExtensionUpdateState>;
export declare function downloadFromGitHubRelease(installMetadata: ExtensionInstallMetadata, destination: string): Promise<GitHubDownloadResult>;
export declare function findReleaseAsset(assets: Asset[]): Asset | undefined;
export declare function extractFile(file: string, dest: string): Promise<void>;
export {};
