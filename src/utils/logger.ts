/*---------------------------------------------------------------------------------------------
 *  Logger Manager
 *  Outputs logs to VS Code's output window
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

let outputChannel: vscode.LogOutputChannel | undefined;

/**
 * Initialize logger manager
 */
export function initialize(channelName = 'Aether'): void {
    // Use LogOutputChannel (VS Code 1.74+), supports native log levels and formatting
    outputChannel = vscode.window.createOutputChannel(channelName, {
        log: true
    });
}

/**
 * Check and prompt VS Code log level settings
 */
export function checkAndPromptLogLevel(): void {
    if (!outputChannel) {
        return;
    }

    const channelLevel = outputChannel.logLevel;
    const envLevel = vscode.env.logLevel;

    info('VS Code log level status:');
    info(
        `  - Output channel level: ${vscode.LogLevel[channelLevel]} (${channelLevel})`
    );
    info(
        `  - Editor environment level: ${vscode.LogLevel[envLevel]} (${envLevel})`
    );

    // If log level is higher than Debug, prompt user
    if (channelLevel > vscode.LogLevel.Debug) {
        warn(
            `Current VS Code log level is ${vscode.LogLevel[channelLevel]}, detailed debug information may not be displayed`
        );
        info(
            'To view detailed debug logs, please execute command: "Developer: Set Log Level" → select "Debug"'
        );

        // Show notification
        vscode.window
            .showInformationMessage(
                `Aether: Current VS Code log level is ${vscode.LogLevel[channelLevel]}`,
                'Set Log Level',
                'Ignore'
            )
            .then((selection) => {
                if (selection === 'Set Log Level') {
                    vscode.commands.executeCommand(
                        'workbench.action.setLogLevel'
                    );
                }
            });
    } else {
        info(
            `VS Code log level is set to ${vscode.LogLevel[channelLevel]}, detailed debug information can be viewed`
        );
    }
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
 * Logger Manager (deprecated class-like interface for backward compatibility)
 */
export const Logger = {
    initialize,
    checkAndPromptLogLevel,
    trace,
    debug,
    info,
    warn,
    error,
    dispose
};
