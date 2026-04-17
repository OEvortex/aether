/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { PermissionManager } from '../permissions/permission-manager.js';
import type { PermissionCheckContext } from '../permissions/types.js';
import type { ToolCallConfirmationDetails, ToolConfirmationPayload } from '../tools/tools.js';
import { ToolConfirmationOutcome } from '../tools/tools.js';
/**
 * Build a {@link PermissionCheckContext} from raw tool invocation parameters.
 *
 * Extracts `command`, `filePath`, `domain`, and `specifier` fields from the
 * tool's params, resolving relative paths against `targetDir`.
 */
export declare function buildPermissionCheckContext(toolName: string, toolParams: Record<string, unknown>, targetDir: string): PermissionCheckContext;
/** Result of {@link evaluatePermissionRules}. */
export interface PermissionEvalResult {
    /** The final permission after PM override. */
    finalPermission: string;
    /**
     * `true` when PM explicitly forces `'ask'`.  In that case "Always Allow"
     * buttons should be hidden because allow rules can never override the
     * higher-priority ask rule.
     */
    pmForcedAsk: boolean;
}
/**
 * L4 — evaluate {@link PermissionManager} rules against the given context.
 *
 * Returns the final permission decision and whether PM forced 'ask'.
 * When `defaultPermission` is already `'deny'`, PM evaluation is skipped.
 */
export declare function evaluatePermissionRules(pm: PermissionManager | null | undefined, defaultPermission: string, pmCtx: PermissionCheckContext): Promise<PermissionEvalResult>;
/**
 * Inject centralized permission rules into confirmation details when the tool
 * doesn't provide its own.  This ensures "Always Allow" persists a properly
 * scoped rule rather than nothing.
 *
 * Only `exec` / `mcp` / `info` types support the `permissionRules` field.
 * Mutates `confirmationDetails` in place.
 */
export declare function injectPermissionRulesIfMissing(confirmationDetails: ToolCallConfirmationDetails, pmCtx: PermissionCheckContext): void;
/**
 * Persist permission rules for `ProceedAlwaysProject` / `ProceedAlwaysUser`
 * outcomes.
 *
 * Reads rules from `confirmationDetails.permissionRules` (set by the tool or
 * by {@link injectPermissionRulesIfMissing}), falling back to
 * `payload.permissionRules` for backward compatibility.
 *
 * Writes to disk via `persistFn` and updates the in-memory
 * {@link PermissionManager}.  No-op for other outcomes.
 */
export declare function persistPermissionOutcome(outcome: ToolConfirmationOutcome, confirmationDetails: ToolCallConfirmationDetails, persistFn: ((scope: 'project' | 'user', ruleType: 'allow' | 'ask' | 'deny', rule: string) => Promise<void>) | undefined, pm: PermissionManager | null | undefined, payload?: ToolConfirmationPayload): Promise<void>;
