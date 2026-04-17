/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
    Config,
    ToolCallRequestInfo,
    ToolCallResponseInfo
} from '../index.js';
import {
    type AllToolCallsCompleteHandler,
    CoreToolScheduler,
    type OutputUpdateHandler,
    type ToolCallsUpdateHandler
} from './coreToolScheduler.js';

export interface ExecuteToolCallOptions {
    outputUpdateHandler?: OutputUpdateHandler;
    onAllToolCallsComplete?: AllToolCallsCompleteHandler;
    onToolCallsUpdate?: ToolCallsUpdateHandler;
}

/**
 * Executes a single tool call non-interactively by leveraging the CoreToolScheduler.
 */
export async function executeToolCall(
    config: Config,
    toolCallRequest: ToolCallRequestInfo,
    abortSignal: AbortSignal,
    options: ExecuteToolCallOptions = {}
): Promise<ToolCallResponseInfo> {
    return new Promise<ToolCallResponseInfo>((resolve, reject) => {
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
            onEditorClose: () => {}
        })
            .schedule(toolCallRequest, abortSignal)
            .catch(reject);
    });
}
