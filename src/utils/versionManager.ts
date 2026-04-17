/*---------------------------------------------------------------------------------------------
 *  Version Management Tool
 *  Provides a unified method for obtaining the version number
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

let _version: string | null = null;

/**
 * Get extension version number
 */
export function getVersion(): string {
    if (_version === null) {
        const extension = vscode.extensions.getExtension(
            'vicanent.copilot-helper-pro'
        );
        _version = extension?.packageJSON?.version || '0.4.0';
    }
    return _version ?? '0.4.0';
}

/**
 * Get user agent string
 */
export function getUserAgent(component: string): string {
    return `CHP-${component}/${getVersion()}`;
}

/**
 * Get client information
 */
export function getClientInfo(): { name: string; version: string } {
    return {
        name: 'Aether',
        version: getVersion()
    };
}

/**
 * Reset cache (mainly for testing)
 */
export function resetCache(): void {
    _version = null;
}

/**
 * Version Manager (deprecated class-like interface for backward compatibility)
 */
export const VersionManager = {
    getVersion,
    getUserAgent,
    getClientInfo,
    resetCache
};
