/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { ToolConfirmationOutcome } from '../tools/tools.js';
export declare enum ToolCallDecision {
    ACCEPT = "accept",
    REJECT = "reject",
    MODIFY = "modify",
    AUTO_ACCEPT = "auto_accept"
}
export declare function getDecisionFromOutcome(outcome: ToolConfirmationOutcome): ToolCallDecision;
