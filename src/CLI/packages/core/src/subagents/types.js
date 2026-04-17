/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Error thrown when a subagent operation fails.
 */
export class SubagentError extends Error {
    code;
    subagentName;
    constructor(message, code, subagentName) {
        super(message);
        this.code = code;
        this.subagentName = subagentName;
        this.name = 'SubagentError';
    }
}
/**
 * Error codes for subagent operations.
 */
export const SubagentErrorCode = {
    NOT_FOUND: 'NOT_FOUND',
    ALREADY_EXISTS: 'ALREADY_EXISTS',
    INVALID_CONFIG: 'INVALID_CONFIG',
    INVALID_NAME: 'INVALID_NAME',
    FILE_ERROR: 'FILE_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    TOOL_NOT_FOUND: 'TOOL_NOT_FOUND'
};
//# sourceMappingURL=types.js.map