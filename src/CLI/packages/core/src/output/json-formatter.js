/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import stripAnsi from 'strip-ansi';
export class JsonFormatter {
    format(response, stats, error) {
        const output = {};
        if (response !== undefined) {
            output.response = stripAnsi(response);
        }
        if (stats) {
            output.stats = stats;
        }
        if (error) {
            output.error = error;
        }
        return JSON.stringify(output, null, 2);
    }
    formatError(error, code) {
        const jsonError = {
            type: error.constructor.name,
            message: stripAnsi(error.message),
            ...(code && { code })
        };
        return this.format(undefined, undefined, jsonError);
    }
}
//# sourceMappingURL=json-formatter.js.map