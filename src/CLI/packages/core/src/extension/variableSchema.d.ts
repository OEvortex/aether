/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface VariableDefinition {
    type: 'string';
    description: string;
    default?: string;
    required?: boolean;
}
export interface VariableSchema {
    [key: string]: VariableDefinition;
}
export interface LoadExtensionContext {
    extensionDir: string;
    workspaceDir?: string;
}
export declare const VARIABLE_SCHEMA: {
    readonly extensionPath: {
        readonly type: "string";
        readonly description: "The path of the extension in the filesystem.";
    };
    readonly CLAUDE_PLUGIN_ROOT: {
        readonly type: "string";
        readonly description: "The path of the extension in the filesystem.";
    };
    readonly workspacePath: {
        readonly type: "string";
        readonly description: "The absolute path of the current workspace.";
    };
    readonly '/': {
        readonly type: "string";
        readonly description: "The path separator.";
    };
    readonly pathSeparator: {
        readonly type: "string";
        readonly description: "The path separator.";
    };
};
