/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import { type HookDefinition, type HookEventName } from './types.js';
export declare class TrustedHooksManager {
    private configPath;
    private trustedHooks;
    constructor();
    private load;
    private save;
    /**
     * Get untrusted hooks for a project
     * @param projectPath Absolute path to the project root
     * @param hooks The hooks configuration to check
     * @returns List of untrusted hook commands/names
     */
    getUntrustedHooks(projectPath: string, hooks: {
        [K in HookEventName]?: HookDefinition[];
    }): string[];
    /**
     * Trust all provided hooks for a project
     */
    trustHooks(projectPath: string, hooks: {
        [K in HookEventName]?: HookDefinition[];
    }): void;
}
