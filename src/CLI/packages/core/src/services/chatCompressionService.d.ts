/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Content } from '@google/genai';
import type { Config } from '../config/config.js';
import type { GeminiChat } from '../core/geminiChat.js';
import { type ChatCompressionInfo } from '../core/turn.js';
/**
 * Threshold for compression token count as a fraction of the model's token limit.
 * If the chat history exceeds this threshold, it will be compressed.
 */
export declare const COMPRESSION_TOKEN_THRESHOLD = 0.65;
/**
 * The fraction of the latest chat history to keep. A value of 0.3
 * means that only the last 30% of the chat history will be kept after compression.
 */
export declare const COMPRESSION_PRESERVE_THRESHOLD = 0.3;
/**
 * Minimum fraction of history (by character count) that must be compressible
 * to proceed with a compression API call. Prevents futile calls where the
 * model receives almost no context and generates a useless summary.
 */
export declare const MIN_COMPRESSION_FRACTION = 0.05;
/**
 * Returns the index of the oldest item to keep when compressing. May return
 * contents.length which indicates that everything should be compressed.
 *
 * Exported for testing purposes.
 */
export declare function findCompressSplitPoint(contents: Content[], fraction: number): number;
export declare class ChatCompressionService {
    compress(chat: GeminiChat, promptId: string, force: boolean, model: string, config: Config, hasFailedCompressionAttempt: boolean, signal?: AbortSignal): Promise<{
        newHistory: Content[] | null;
        info: ChatCompressionInfo;
    }>;
}
