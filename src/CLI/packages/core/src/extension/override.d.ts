/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export interface ExtensionEnablementConfig {
    overrides: string[];
}
export interface AllExtensionsEnablementConfig {
    [extensionName: string]: ExtensionEnablementConfig;
}
export declare class Override {
    baseRule: string;
    isDisable: boolean;
    includeSubdirs: boolean;
    constructor(baseRule: string, isDisable: boolean, includeSubdirs: boolean);
    static fromInput(inputRule: string, includeSubdirs: boolean): Override;
    static fromFileRule(fileRule: string): Override;
    conflictsWith(other: Override): boolean;
    isEqualTo(other: Override): boolean;
    asRegex(): RegExp;
    isChildOf(parent: Override): boolean;
    output(): string;
    matchesPath(path: string): boolean;
}
