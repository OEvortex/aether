/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 *
 * Speculation Tool Gate
 *
 * Determines which tool calls are allowed during speculative execution.
 * Returns 'allow' for safe read-only tools, 'redirect' for write tools
 * (only when approval mode permits), or 'boundary' to stop speculation.
 *
 * SECURITY: Speculation bypasses the normal permission/approval flow.
 * Write tools are ONLY redirected to overlay when the user's approval mode
 * already permits automatic edits (auto-edit or yolo). In default/plan mode,
 * write tools hit boundary — no silent writes without user consent.
 */
import { ApprovalMode } from '../config/config.js';
import type { OverlayFs } from './overlayFs.js';
export interface ToolGateResult {
    action: 'allow' | 'redirect' | 'boundary';
    reason?: string;
}
/**
 * Evaluate whether a tool call is allowed during speculative execution.
 *
 * @param toolName - The tool's internal name (from ToolNames)
 * @param args - The tool call arguments
 * @param overlayFs - The overlay filesystem for path rewriting
 * @param approvalMode - The user's current approval mode
 * @returns Gate result: allow, redirect, or boundary
 */
export declare function evaluateToolCall(toolName: string, args: Record<string, unknown>, overlayFs: OverlayFs, approvalMode: ApprovalMode): Promise<ToolGateResult>;
/**
 * Rewrite file path arguments to point to the overlay filesystem.
 * Mutates the args object in place.
 */
export declare function rewritePathArgs(args: Record<string, unknown>, overlayFs: OverlayFs): Promise<void>;
