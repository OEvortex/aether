/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { getLanguageFromFilePath } from '../utils/language-detection.js';
export function getProgrammingLanguage(args) {
    const filePath = args.file_path || args.path;
    if (typeof filePath === 'string') {
        return getLanguageFromFilePath(filePath);
    }
    return undefined;
}
//# sourceMappingURL=telemetry-utils.js.map