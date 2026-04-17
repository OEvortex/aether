/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { type IdeInfo } from './detect-ide.js';
export interface IdeInstaller {
    install(): Promise<InstallResult>;
}
export interface InstallResult {
    success: boolean;
    message: string;
}
export declare function getIdeInstaller(ide: IdeInfo, platform?: NodeJS.Platform): IdeInstaller | null;
