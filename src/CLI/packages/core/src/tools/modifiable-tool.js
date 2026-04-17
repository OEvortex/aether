/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as Diff from 'diff';
import { createDebugLogger } from '../utils/debugLogger.js';
import { openDiff } from '../utils/editor.js';
import { isNodeError } from '../utils/errors.js';
import { DEFAULT_DIFF_OPTIONS } from './diffOptions.js';
const debugLogger = createDebugLogger('MODIFIABLE_TOOL');
/**
 * Type guard to check if a declarative tool is modifiable.
 */
export function isModifiableDeclarativeTool(tool) {
    return 'getModifyContext' in tool;
}
function createTempFilesForModify(currentContent, proposedContent, file_path) {
    const tempDir = os.tmpdir();
    const diffDir = path.join(tempDir, 'aether-cli-tool-modify-diffs');
    if (!fs.existsSync(diffDir)) {
        fs.mkdirSync(diffDir, { recursive: true });
    }
    const ext = path.extname(file_path);
    const fileName = path.basename(file_path, ext);
    const timestamp = Date.now();
    const tempOldPath = path.join(diffDir, `aether-cli-modify-${fileName}-old-${timestamp}${ext}`);
    const tempNewPath = path.join(diffDir, `aether-cli-modify-${fileName}-new-${timestamp}${ext}`);
    fs.writeFileSync(tempOldPath, currentContent, 'utf8');
    fs.writeFileSync(tempNewPath, proposedContent, 'utf8');
    return { oldPath: tempOldPath, newPath: tempNewPath };
}
function getUpdatedParams(tmpOldPath, tempNewPath, originalParams, modifyContext) {
    let oldContent = '';
    let newContent = '';
    try {
        oldContent = fs.readFileSync(tmpOldPath, 'utf8');
    }
    catch (err) {
        if (!isNodeError(err) || err.code !== 'ENOENT') {
            throw err;
        }
        oldContent = '';
    }
    try {
        newContent = fs.readFileSync(tempNewPath, 'utf8');
    }
    catch (err) {
        if (!isNodeError(err) || err.code !== 'ENOENT') {
            throw err;
        }
        newContent = '';
    }
    const updatedParams = modifyContext.createUpdatedParams(oldContent, newContent, originalParams);
    const updatedDiff = Diff.createPatch(path.basename(modifyContext.getFilePath(originalParams)), oldContent, newContent, 'Current', 'Proposed', DEFAULT_DIFF_OPTIONS);
    return { updatedParams, updatedDiff };
}
function deleteTempFiles(oldPath, newPath) {
    try {
        fs.unlinkSync(oldPath);
    }
    catch {
        debugLogger.warn(`Error deleting temp diff file: ${oldPath}`);
    }
    try {
        fs.unlinkSync(newPath);
    }
    catch {
        debugLogger.warn(`Error deleting temp diff file: ${newPath}`);
    }
}
/**
 * Triggers an external editor for the user to modify the proposed content,
 * and returns the updated tool parameters and the diff after the user has modified the proposed content.
 */
export async function modifyWithEditor(originalParams, modifyContext, editorType, _abortSignal, onEditorClose) {
    const currentContent = await modifyContext.getCurrentContent(originalParams);
    const proposedContent = await modifyContext.getProposedContent(originalParams);
    const { oldPath, newPath } = createTempFilesForModify(currentContent, proposedContent, modifyContext.getFilePath(originalParams));
    try {
        await openDiff(oldPath, newPath, editorType, onEditorClose);
        const result = getUpdatedParams(oldPath, newPath, originalParams, modifyContext);
        return result;
    }
    finally {
        deleteTempFiles(oldPath, newPath);
    }
}
//# sourceMappingURL=modifiable-tool.js.map