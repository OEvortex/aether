/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { ToolConfirmationOutcome } from '../tools/tools.js';
export var ToolCallDecision;
(function (ToolCallDecision) {
    ToolCallDecision["ACCEPT"] = "accept";
    ToolCallDecision["REJECT"] = "reject";
    ToolCallDecision["MODIFY"] = "modify";
    ToolCallDecision["AUTO_ACCEPT"] = "auto_accept";
})(ToolCallDecision || (ToolCallDecision = {}));
export function getDecisionFromOutcome(outcome) {
    switch (outcome) {
        case ToolConfirmationOutcome.ProceedOnce:
            return ToolCallDecision.ACCEPT;
        case ToolConfirmationOutcome.ProceedAlways:
        case ToolConfirmationOutcome.ProceedAlwaysServer:
        case ToolConfirmationOutcome.ProceedAlwaysTool:
        case ToolConfirmationOutcome.ProceedAlwaysProject:
        case ToolConfirmationOutcome.ProceedAlwaysUser:
            return ToolCallDecision.AUTO_ACCEPT;
        case ToolConfirmationOutcome.ModifyWithEditor:
            return ToolCallDecision.MODIFY;
        default:
            return ToolCallDecision.REJECT;
    }
}
//# sourceMappingURL=tool-call-decision.js.map