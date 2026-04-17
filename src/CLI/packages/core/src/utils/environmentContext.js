/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { getFolderStructure } from './getFolderStructure.js';
/**
 * Generates a string describing the current workspace directories and their structures.
 * @param {Config} config - The runtime configuration and services.
 * @returns {Promise<string>} A promise that resolves to the directory context string.
 */
export async function getDirectoryContextString(config) {
    const workspaceContext = config.getWorkspaceContext();
    const workspaceDirectories = workspaceContext.getDirectories();
    const folderStructures = await Promise.all(workspaceDirectories.map((dir) => getFolderStructure(dir, {
        fileService: config.getFileService()
    })));
    const folderStructure = folderStructures.join('\n');
    let workingDirPreamble;
    if (workspaceDirectories.length === 1) {
        workingDirPreamble = `I'm currently working in the directory: ${workspaceDirectories[0]}`;
    }
    else {
        const dirList = workspaceDirectories
            .map((dir) => `  - ${dir}`)
            .join('\n');
        workingDirPreamble = `I'm currently working in the following directories:\n${dirList}`;
    }
    return `${workingDirPreamble}
Here is the folder structure of the current working directories:

${folderStructure}`;
}
/**
 * Retrieves environment-related information to be included in the chat context.
 * This includes the current working directory, date, operating system, and folder structure.
 * @param {Config} config - The runtime configuration and services.
 * @returns A promise that resolves to an array of `Part` objects containing environment information.
 */
export async function getEnvironmentContext(config) {
    const today = new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const platform = process.platform;
    const directoryContext = await getDirectoryContextString(config);
    const context = `
This is the Aether. We are setting up the context for our chat.
Today's date is ${today} (formatted according to the user's locale).
My operating system is: ${platform}
${directoryContext}
        `.trim();
    return [{ text: context }];
}
const STARTUP_CONTEXT_MODEL_ACK = 'Got it. Thanks for the context!';
export async function getInitialChatHistory(config, extraHistory) {
    if (config.getSkipStartupContext()) {
        return extraHistory ? [...extraHistory] : [];
    }
    const envParts = await getEnvironmentContext(config);
    const envContextString = envParts
        .map((part) => part.text || '')
        .join('\n\n');
    return [
        {
            role: 'user',
            parts: [{ text: envContextString }]
        },
        {
            role: 'model',
            parts: [{ text: STARTUP_CONTEXT_MODEL_ACK }]
        },
        ...(extraHistory ?? [])
    ];
}
/**
 * Strip the leading startup context (env-info user message + model ack)
 * from a chat history. Used when forwarding a parent session's history
 * to a child agent that will generate its own startup context for its
 * own working directory.
 */
export function stripStartupContext(history) {
    if (history.length < 2) {
        return history;
    }
    const secondEntry = history[1];
    const ackText = secondEntry?.parts?.[0]?.text;
    if (secondEntry?.role === 'model' &&
        ackText === STARTUP_CONTEXT_MODEL_ACK) {
        return history.slice(2);
    }
    return history;
}
//# sourceMappingURL=environmentContext.js.map