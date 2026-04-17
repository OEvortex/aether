/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Error thrown when a skill operation fails.
 */
export class SkillError extends Error {
    code;
    skillName;
    constructor(message, code, skillName) {
        super(message);
        this.code = code;
        this.skillName = skillName;
        this.name = 'SkillError';
    }
}
/**
 * Error codes for skill operations.
 */
export const SkillErrorCode = {
    NOT_FOUND: 'NOT_FOUND',
    INVALID_CONFIG: 'INVALID_CONFIG',
    INVALID_NAME: 'INVALID_NAME',
    FILE_ERROR: 'FILE_ERROR',
    PARSE_ERROR: 'PARSE_ERROR'
};
//# sourceMappingURL=types.js.map