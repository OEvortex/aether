/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../../config/config.js';
import { type Backend, type DisplayMode } from './types.js';
export interface DetectBackendResult {
    backend: Backend;
    warning?: string;
}
/**
 * Detect and create the appropriate Backend.
 *
 * Detection priority:
 * 1. User explicit preference (--display=in-process|tmux|iterm2)
 * 2. Auto-detect:
 *    - inside tmux: TmuxBackend
 *    - other terminals: tmux external session mode when tmux is available
 *    - fallback to InProcessBackend
 *
 * @param preference - Optional display mode preference
 * @param runtimeContext - Runtime config for in-process fallback
 */
export declare function detectBackend(preference: DisplayMode | undefined, runtimeContext: Config): Promise<DetectBackendResult>;
