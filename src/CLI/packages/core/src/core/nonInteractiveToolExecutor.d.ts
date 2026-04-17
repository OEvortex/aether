/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config, ToolCallRequestInfo, ToolCallResponseInfo } from '../index.js';
import { type AllToolCallsCompleteHandler, type OutputUpdateHandler, type ToolCallsUpdateHandler } from './coreToolScheduler.js';
export interface ExecuteToolCallOptions {
    outputUpdateHandler?: OutputUpdateHandler;
    onAllToolCallsComplete?: AllToolCallsCompleteHandler;
    onToolCallsUpdate?: ToolCallsUpdateHandler;
}
/**
 * Executes a single tool call non-interactively by leveraging the CoreToolScheduler.
 */
export declare function executeToolCall(config: Config, toolCallRequest: ToolCallRequestInfo, abortSignal: AbortSignal, options?: ExecuteToolCallOptions): Promise<ToolCallResponseInfo>;
