/*---------------------------------------------------------------------------------------------
 *  High-Frequency Status Logger Manager
 *  Dedicated to primaryInstanceManager and other high-frequency status refresh modules,
 *  separated from the main log channel.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

let outputChannel: vscode.LogOutputChannel | undefined;

/**
 * Initialize high-frequency status logger manager
 */
export function initialize(channelName = 'CHP-Status'): void {
    // Use LogOutputChannel (VS Code 1.74+), supports native log levels and formatting
    outputChannel = vscode.window.createOutputChannel(channelName, {
        log: true
    });
}

/**
 * Trace level log (VS Code LogLevel.Trace = 1)
 */
export function trace(message: string, ...args: unknown[]): void {
    if (outputChannel) {
        outputChannel.trace(message, ...args);
    }
}

/**
 * Debug level log (VS Code LogLevel.Debug = 2)
 */
export function debug(message: string, ...args: unknown[]): void {
    if (outputChannel) {
        outputChannel.debug(message, ...args);
    }
}

/**
 * Info level log (VS Code LogLevel.Info = 3)
 */
export function info(message: string, ...args: unknown[]): void {
    if (outputChannel) {
        outputChannel.info(message, ...args);
    }
}

/**
 * Warning level log (VS Code LogLevel.Warning = 4)
 */
export function warn(message: string, ...args: unknown[]): void {
    if (outputChannel) {
        outputChannel.warn(message, ...args);
    }
}

/**
 * Error level log (VS Code LogLevel.Error = 5)
 */
export function error(message: string | Error, ...args: unknown[]): void {
    if (outputChannel) {
        outputChannel.error(message, ...args);
    }
}

/**
 * Dispose logger manager
 */
export function dispose(): void {
    if (outputChannel) {
        outputChannel.dispose();
    }
}

/**
 * High-Frequency Status Logger Manager (deprecated class-like interface for backward compatibility)
 */
export const StatusLogger = {
    initialize,
    trace,
    debug,
    info,
    warn,
    error,
    dispose
};
