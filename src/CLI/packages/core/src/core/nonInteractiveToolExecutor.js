/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { CoreToolScheduler } from './coreToolScheduler.js';
/**
 * Executes a single tool call non-interactively by leveraging the CoreToolScheduler.
 */
export async function executeToolCall(config, toolCallRequest, abortSignal, options = {}) {
    return new Promise((resolve, reject) => {
        new CoreToolScheduler({
            config,
            chatRecordingService: config.getChatRecordingService(),
            outputUpdateHandler: options.outputUpdateHandler,
            onAllToolCallsComplete: async (completedToolCalls) => {
                if (options.onAllToolCallsComplete) {
                    await options.onAllToolCallsComplete(completedToolCalls);
                }
                resolve(completedToolCalls[0].response);
            },
            onToolCallsUpdate: options.onToolCallsUpdate,
            getPreferredEditor: () => undefined,
            onEditorClose: () => { }
        })
            .schedule(toolCallRequest, abortSignal)
            .catch(reject);
    });
}
//# sourceMappingURL=nonInteractiveToolExecutor.js.map