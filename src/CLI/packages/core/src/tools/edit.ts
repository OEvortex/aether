/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as Diff from 'diff';
import type { Config } from '../config/config.js';
import { ApprovalMode } from '../config/config.js';
import { IdeClient } from '../ide/ide-client.js';
import type { PermissionDecision } from '../permissions/types.js';
import type { LineEnding } from '../services/fileSystemService.js';
import {
    detectLineEnding,
    FileEncoding,
    needsUtf8Bom
} from '../services/fileSystemService.js';
import { logFileOperation } from '../telemetry/loggers.js';
import { FileOperation } from '../telemetry/metrics.js';
import { FileOperationEvent } from '../telemetry/types.js';
import {
    countOccurrences,
    maybeAugmentOldStringForDeletion,
    normalizeEditStrings
} from '../utils/editHelper.js';
import { isNodeError } from '../utils/errors.js';
import {
    getSpecificMimeType,
    fileExists as isFilefileExists
} from '../utils/fileUtils.js';
import { getLanguageFromFilePath } from '../utils/language-detection.js';
import { makeRelative, shortenPath } from '../utils/paths.js';
import { safeLiteralReplace } from '../utils/textUtils.js';
import { DEFAULT_DIFF_OPTIONS } from './diffOptions.js';
import type {
    ModifiableDeclarativeTool,
    ModifyContext
} from './modifiable-tool.js';
import { ReadFileTool } from './read-file.js';
import { ToolErrorType } from './tool-error.js';
import { ToolDisplayNames, ToolNames } from './tool-names.js';
import type {
    ToolCallConfirmationDetails,
    ToolEditConfirmationDetails,
    ToolInvocation,
    ToolLocation,
    ToolResult
} from './tools.js';
import { BaseDeclarativeTool, Kind, ToolConfirmationOutcome } from './tools.js';

export function applyReplacement(
    currentContent: string | null,
    oldString: string,
    newString: string,
    isNewFile: boolean
): string {
    if (isNewFile) {
        return newString;
    }
    if (currentContent === null) {
        // Should not happen if not a new file, but defensively return empty or newString if oldString is also empty
        return oldString === '' ? newString : '';
    }
    // If oldString is empty and it's not a new file, do not modify the content.
    if (oldString === '' && !isNewFile) {
        return currentContent;
    }

    // Use intelligent replacement that handles $ sequences safely
    return safeLiteralReplace(currentContent, oldString, newString);
}

/**
 * Single replacement operation
 */
export interface ReplacementOperation {
    /**
     * The absolute path to the file to modify
     */
    filePath: string;

    /**
     * Explanation for this specific replacement
     */
    explanation?: string;

    /**
     * The text to replace
     */
    oldString: string;

    /**
     * The text to replace it with
     */
    newString: string;

    /**
     * Whether the edit was modified manually by the user.
     */
    modified_by_user?: boolean;
}

/**
 * Parameters for the Edit tool
 */
export interface EditToolParams {
    /**
     * Overall explanation for the edit operation
     */
    explanation?: string;

    /**
     * Array of replacement operations to apply sequentially
     */
    replacements?: ReplacementOperation[];

    /**
     * Legacy single-replacement format (deprecated, use replacements instead)
     */
    file_path?: string;

    /**
     * Legacy single-replacement format (deprecated, use replacements instead)
     */
    old_string?: string;

    /**
     * Legacy single-replacement format (deprecated, use replacements instead)
     */
    new_string?: string;

    /**
     * Replace every occurrence of old_string instead of requiring a unique match.
     */
    replace_all?: boolean;

    /**
     * Whether the edit was modified manually by the user.
     */
    modified_by_user?: boolean;

    /**
     * Initially proposed content.
     */
    ai_proposed_content?: string;
}

interface CalculatedEdit {
    currentContent: string | null;
    newContent: string;
    occurrences: number;
    error?: { display: string; raw: string; type: ToolErrorType };
    isNewFile: boolean;
    /** Detected encoding of the existing file (e.g. 'utf-8', 'gbk') */
    encoding: string;
    /** Whether the existing file has a UTF-8 BOM */
    bom: boolean;
    /** Original line ending style of the existing file */
    lineEnding: LineEnding;
}

class EditToolInvocation implements ToolInvocation<EditToolParams, ToolResult> {
    constructor(
        private readonly config: Config,
        public params: EditToolParams
    ) {
        // Normalize params: convert legacy single-replacement format to multi-replace format
        if (!this.params.replacements && this.params.file_path && this.params.old_string !== undefined && this.params.new_string !== undefined) {
            this.params.replacements = [{
                filePath: this.params.file_path,
                oldString: this.params.old_string,
                newString: this.params.new_string,
                explanation: this.params.explanation
            }];
        }
    }

    toolLocations(): ToolLocation[] {
        if (!this.params.replacements) {
            return [];
        }
        return this.params.replacements.map(r => ({ path: r.filePath }));
    }

    /**
     * Calculates the potential outcome of an edit operation.
     * @param params Parameters for the edit operation
     * @returns An object describing the potential edit outcome
     * @throws File system errors if reading the file fails unexpectedly (e.g., permissions)
     */
    private async calculateEdit(
        params: EditToolParams
    ): Promise<Map<string, CalculatedEdit>> {
        if (!params.replacements || params.replacements.length === 0) {
            throw new Error('No replacements provided');
        }

        const results = new Map<string, CalculatedEdit>();

        for (const replacement of params.replacements) {
            const replaceAll = params.replace_all ?? false;
            let currentContent: string | null = null;
            let fileExists = await isFilefileExists(replacement.filePath);
            let isNewFile = false;
            let finalNewString = replacement.newString;
            let finalOldString = replacement.oldString;
            let occurrences = 0;
            let error:
                | { display: string; raw: string; type: ToolErrorType }
                | undefined;
            let useBOM = false;
            let detectedEncoding = 'utf-8';
            let detectedLineEnding: LineEnding = 'lf';
            
            if (fileExists) {
                try {
                    const fileInfo = await this.config
                        .getFileSystemService()
                        .readTextFile({ path: replacement.filePath });
                    if (fileInfo._meta?.bom !== undefined) {
                        useBOM = fileInfo._meta.bom;
                    } else {
                        useBOM =
                            fileInfo.content.length > 0 &&
                            fileInfo.content.codePointAt(0) === 0xfeff;
                    }
                    detectedEncoding = fileInfo._meta?.encoding || 'utf-8';
                    // Detect original line ending style before normalizing
                    detectedLineEnding = detectLineEnding(fileInfo.content);
                    // Normalize line endings to LF for consistent processing.
                    currentContent = fileInfo.content.replace(/\r\n/g, '\n');
                    fileExists = true;
                    // Encoding and BOM are returned from the same I/O pass, avoiding redundant reads.
                } catch (err: unknown) {
                    if (!isNodeError(err) || err.code !== 'ENOENT') {
                        // Rethrow unexpected FS errors (permissions, etc.)
                        throw err;
                    }
                    fileExists = false;
                }
            }

            const normalizedStrings = normalizeEditStrings(
                currentContent,
                finalOldString,
                finalNewString
            );
            finalOldString = normalizedStrings.oldString;
            finalNewString = normalizedStrings.newString;

            if (finalOldString === '' && !fileExists) {
                // Creating a new file
                isNewFile = true;
            } else if (!fileExists) {
                // Trying to edit a nonexistent file (and old_string is not empty)
                error = {
                    display: `File not found. Cannot apply edit. Use an empty old_string to create a new file.`,
                    raw: `File not found: ${replacement.filePath}`,
                    type: ToolErrorType.FILE_NOT_FOUND
                };
            } else if (currentContent !== null) {
                finalOldString = maybeAugmentOldStringForDeletion(
                    currentContent,
                    finalOldString,
                    finalNewString
                );

                occurrences = countOccurrences(currentContent, finalOldString);
                if (replacement.oldString === '') {
                    // Error: Trying to create a file that already exists
                    error = {
                        display: `Failed to edit. Attempted to create a file that already exists.`,
                        raw: `File already exists, cannot create: ${replacement.filePath}`,
                        type: ToolErrorType.ATTEMPT_TO_CREATE_EXISTING_FILE
                    };
                } else if (occurrences === 0) {
                    error = {
                        display: `Failed to edit, could not find the string to replace.`,
                        raw: `Failed to edit, 0 occurrences found for old_string in ${replacement.filePath}. No edits made. The exact text in old_string was not found. Ensure you're not escaping content incorrectly and check whitespace, indentation, and context. Use ${ReadFileTool.Name} tool to verify.`,
                        type: ToolErrorType.EDIT_NO_OCCURRENCE_FOUND
                    };
                } else if (!replaceAll && occurrences > 1) {
                    error = {
                        display: `Failed to edit because the text matches multiple locations. Provide more context or set replace_all to true.`,
                        raw: `Failed to edit. Found ${occurrences} occurrences for old_string in ${replacement.filePath} but replace_all was not enabled.`,
                        type: ToolErrorType.EDIT_EXPECTED_OCCURRENCE_MISMATCH
                    };
                } else if (finalOldString === finalNewString) {
                    error = {
                        display: `No changes to apply. The old_string and new_string are identical.`,
                        raw: `No changes to apply. The old_string and new_string are identical in file: ${replacement.filePath}`,
                        type: ToolErrorType.EDIT_NO_CHANGE
                    };
                }
            } else {
                // Should not happen if fileExists and no exception was thrown, but defensively:
                error = {
                    display: `Failed to read content of file.`,
                    raw: `Failed to read content of existing file: ${replacement.filePath}`,
                    type: ToolErrorType.READ_CONTENT_FAILURE
                };
            }

            const newContent = !error
                ? applyReplacement(
                      currentContent,
                      finalOldString,
                      finalNewString,
                      isNewFile
                  )
                : (currentContent ?? '');

            if (!error && fileExists && currentContent === newContent) {
                error = {
                    display:
                        'No changes to apply. The new content is identical to the current content.',
                    raw: `No changes to apply. The new content is identical to the current content in file: ${replacement.filePath}`,
                    type: ToolErrorType.EDIT_NO_CHANGE
                };
            }

            results.set(replacement.filePath, {
                currentContent,
                newContent,
                occurrences,
                error,
                isNewFile,
                bom: useBOM,
                encoding: detectedEncoding,
                lineEnding: detectedLineEnding
            });
        }

        return results;
    }

    /**
     * Edit operations always need user confirmation (unless overridden by PM or ApprovalMode).
     */
    async getDefaultPermission(): Promise<PermissionDecision> {
        return 'ask';
    }

    /**
     * Constructs the edit diff confirmation details.
     */
    async getConfirmationDetails(
        abortSignal: AbortSignal
    ): Promise<ToolCallConfirmationDetails> {
        let editDataMap: Map<string, CalculatedEdit>;
        try {
            editDataMap = await this.calculateEdit(this.params);
        } catch (error) {
            if (abortSignal.aborted) {
                throw error;
            }
            const errorMsg =
                error instanceof Error ? error.message : String(error);
            throw new Error(`Error preparing edit: ${errorMsg}`);
        }

        // Check for errors in any of the replacements
        for (const [filePath, editData] of editDataMap) {
            if (editData.error) {
                throw new Error(`Edit error for ${filePath}: ${editData.error.display}`);
            }
        }

        // For now, only support single file confirmation for multi-replace
        // In the future, this could be extended to show multiple diffs
        const firstReplacement = this.params.replacements?.[0];
        if (!firstReplacement) {
            throw new Error('No replacements provided');
        }

        const editData = editDataMap.get(firstReplacement.filePath);
        if (!editData) {
            throw new Error(`No edit data for file: ${firstReplacement.filePath}`);
        }

        const fileName = path.basename(firstReplacement.filePath);
        const fileDiff = Diff.createPatch(
            fileName,
            editData.currentContent ?? '',
            editData.newContent,
            'Current',
            'Proposed',
            DEFAULT_DIFF_OPTIONS
        );
        const approvalMode = this.config.getApprovalMode();
        const ideClient = await IdeClient.getInstance();
        const ideConfirmation =
            this.config.getIdeMode() &&
            ideClient.isDiffingEnabled() &&
            approvalMode !== ApprovalMode.AUTO_EDIT &&
            approvalMode !== ApprovalMode.YOLO
                ? ideClient.openDiff(firstReplacement.filePath, editData.newContent)
                : undefined;

        const confirmationDetails: ToolEditConfirmationDetails = {
            type: 'edit',
            title: `Confirm Edit: ${shortenPath(makeRelative(firstReplacement.filePath, this.config.getTargetDir()))}`,
            fileName,
            filePath: firstReplacement.filePath,
            fileDiff,
            originalContent: editData.currentContent,
            newContent: editData.newContent,
            onConfirm: async (outcome: ToolConfirmationOutcome) => {
                if (outcome === ToolConfirmationOutcome.ProceedAlways) {
                    this.config.setApprovalMode(ApprovalMode.AUTO_EDIT);
                }

                if (ideConfirmation) {
                    const result = await ideConfirmation;
                    if (result.status === 'accepted' && result.content) {
                        // Update the first replacement with the modified content
                        if (firstReplacement) {
                            firstReplacement.oldString = editData.currentContent ?? '';
                            firstReplacement.newString = result.content;
                        }
                    }
                }
            },
            ideConfirmation
        };
        return confirmationDetails;
    }

    getDescription(): string {
        if (this.params.replacements && this.params.replacements.length > 0) {
            const files = this.params.replacements.map(r => 
                shortenPath(makeRelative(r.filePath, this.config.getTargetDir()))
            );
            if (files.length === 1) {
                const r = this.params.replacements[0];
                if (r.oldString === '') {
                    return `Create ${files[0]}`;
                }
                return `Edit ${files[0]}`;
            }
            return `Edit ${files.length} files`;
        }
        
        // Legacy format fallback
        if (this.params.file_path) {
            const relativePath = makeRelative(
                this.params.file_path,
                this.config.getTargetDir()
            );
            if (this.params.old_string === '') {
                return `Create ${shortenPath(relativePath)}`;
            }
            return `Edit ${shortenPath(relativePath)}`;
        }
        
        return 'Edit files';
    }

    /**
     * Executes the edit operation with the given parameters.
     * @param params Parameters for the edit operation
     * @returns Result of the edit operation
     */
    async execute(signal: AbortSignal): Promise<ToolResult> {
        let editDataMap: Map<string, CalculatedEdit>;
        try {
            editDataMap = await this.calculateEdit(this.params);
        } catch (error) {
            if (signal.aborted) {
                throw error;
            }
            const errorMsg =
                error instanceof Error ? error.message : String(error);
            return {
                llmContent: `Error preparing edit: ${errorMsg}`,
                returnDisplay: `Error preparing edit: ${errorMsg}`,
                error: {
                    message: errorMsg,
                    type: ToolErrorType.EDIT_PREPARATION_FAILURE
                }
            };
        }

        // Check for errors in any of the replacements
        const errors: string[] = [];
        for (const [filePath, editData] of editDataMap) {
            if (editData.error) {
                errors.push(`${filePath}: ${editData.error.display}`);
            }
        }
        if (errors.length > 0) {
            return {
                llmContent: errors.join('\n'),
                returnDisplay: `Error: ${errors.join(', ')}`,
                error: {
                    message: errors.join('\n'),
                    type: ToolErrorType.EDIT_PREPARATION_FAILURE
                }
            };
        }

        const results: string[] = [];
        let totalLinesChanged = 0;

        try {
            for (const [filePath, editData] of editDataMap) {
                this.ensureParentDirectoriesExist(filePath);

                // For new files, apply default file encoding setting
                // For existing files, preserve the original encoding (BOM and charset)
                if (editData.isNewFile) {
                    const userEncoding = this.config.getDefaultFileEncoding();
                    let useBOM = false;
                    if (userEncoding === FileEncoding.UTF8_BOM) {
                        useBOM = true;
                    } else if (userEncoding === undefined) {
                        // No explicit setting: auto-detect (e.g. .ps1 on non-UTF-8 Windows)
                        useBOM = needsUtf8Bom(filePath);
                    }
                    await this.config.getFileSystemService().writeTextFile({
                        path: filePath,
                        content: editData.newContent,
                        _meta: {
                            bom: useBOM
                        }
                    });
                } else {
                    await this.config.getFileSystemService().writeTextFile({
                        path: filePath,
                        content: editData.newContent,
                        _meta: {
                            bom: editData.bom,
                            encoding: editData.encoding,
                            lineEnding: editData.lineEnding
                        }
                    });
                }

                totalLinesChanged += editData.newContent.split('\n').length;

                // Log file operation for telemetry
                const mimetype = getSpecificMimeType(filePath);
                const programmingLanguage = getLanguageFromFilePath(filePath);
                const extension = path.extname(filePath);
                const operation = editData.isNewFile
                    ? FileOperation.CREATE
                    : FileOperation.UPDATE;

                logFileOperation(
                    this.config,
                    new FileOperationEvent(
                        EditTool.Name,
                        operation,
                        editData.newContent.split('\n').length,
                        mimetype,
                        extension,
                        programmingLanguage
                    )
                );

                const successMessage = editData.isNewFile
                    ? `Created new file: ${filePath} with provided content.`
                    : `The file: ${filePath} has been updated.`;
                results.push(successMessage);
            }

            return {
                llmContent: results.join(' '),
                returnDisplay: results.join('\n')
            };
        } catch (error) {
            const errorMsg =
                error instanceof Error ? error.message : String(error);
            return {
                llmContent: `Error executing edit: ${errorMsg}`,
                returnDisplay: `Error writing files: ${errorMsg}`,
                error: {
                    message: errorMsg,
                    type: ToolErrorType.FILE_WRITE_FAILURE
                }
            };
        }
    }

    /**
     * Creates parent directories if they don't exist
     */
    private ensureParentDirectoriesExist(filePath: string): void {
        const dirName = path.dirname(filePath);
        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { recursive: true });
        }
    }
}

/**
 * Implementation of the Edit tool logic
 */
export class EditTool
    extends BaseDeclarativeTool<EditToolParams, ToolResult>
    implements ModifiableDeclarativeTool<EditToolParams>
{
    static readonly Name = ToolNames.EDIT;
    constructor(private readonly config: Config) {
        super(
            EditTool.Name,
            ToolDisplayNames.EDIT,
            `Replaces text within files. Takes an array of replacement operations and applies them sequentially. Each replacement operation has the same parameters: filePath, oldString, newString, and explanation. This tool is ideal when you need to make multiple edits across different files or multiple edits in the same file. Always use the ${ReadFileTool.Name} tool to examine the file's current content before attempting a text replacement.

      The user has the ability to modify the \`newString\` content. If modified, this will be stated in the response.

Expectation for required parameters:
1. \`explanation\` is an optional overall description of the edit operation.
2. \`replacements\` is an array of replacement operations. At least one replacement must be provided.
3. Each replacement must have:
   - \`filePath\`: The absolute path to the file to modify.
   - \`oldString\`: The exact literal text to replace (including all whitespace, indentation, newlines, and surrounding code etc.).
   - \`newString\`: The exact literal text to replace \`oldString\` with (also including all whitespace, indentation, newlines, and surrounding code etc.).
   - \`explanation\`: Optional description for this specific replacement.
4. NEVER escape \`oldString\` or \`newString\`, that would break the exact literal text requirement.
**Important:** If ANY of the above are not satisfied, the tool will fail. CRITICAL for \`oldString\`: Must uniquely identify the single instance to change (unless using legacy single-replacement format with replace_all). Include at least 3 lines of context BEFORE and AFTER the target text, matching whitespace and indentation precisely. If this string matches multiple locations, or does not match exactly, the tool will fail.

**Legacy single-replacement format:** For backward compatibility, you can also use the single-replacement format with \`file_path\`, \`old_string\`, \`new_string\`, and optionally \`replace_all\`. This format is deprecated and may be removed in the future.`,
            Kind.Edit,
            {
                properties: {
                    explanation: {
                        description: 'Overall explanation for the edit operation.',
                        type: 'string'
                    },
                    replacements: {
                        type: 'array',
                        description: 'Array of replacement operations to apply sequentially.',
                        items: {
                            type: 'object',
                            properties: {
                                filePath: {
                                    description: 'The absolute path to the file to modify. Must start with "/".',
                                    type: 'string'
                                },
                                explanation: {
                                    description: 'Explanation for this specific replacement.',
                                    type: 'string'
                                },
                                oldString: {
                                    description: 'The exact literal text to replace, preferably unescaped. Include at least 3 lines of context BEFORE and AFTER the target text, matching whitespace and indentation precisely.',
                                    type: 'string'
                                },
                                newString: {
                                    description: 'The exact literal text to replace oldString with, preferably unescaped. Provide the EXACT text. Ensure the resulting code is correct and idiomatic.',
                                    type: 'string'
                                }
                            },
                            required: ['filePath', 'oldString', 'newString'],
                            type: 'object'
                        }
                    },
                    // Legacy single-replacement format (deprecated)
                    file_path: {
                        description: 'The absolute path to the file to modify. Must start with "/".',
                        type: 'string'
                    },
                    old_string: {
                        description: 'The exact literal text to replace, preferably unescaped. (Deprecated, use replacements array instead)',
                        type: 'string'
                    },
                    new_string: {
                        description: 'The exact literal text to replace old_string with, preferably unescaped. (Deprecated, use replacements array instead)',
                        type: 'string'
                    },
                    replace_all: {
                        type: 'boolean',
                        description: 'Replace all occurrences of old_string (default false).'
                    }
                },
                required: [],
                type: 'object'
            }
        );
    }

    /**
     * Validates the parameters for the Edit tool
     * @param params Parameters to validate
     * @returns Error message string or null if valid
     */
    protected override validateToolParamValues(
        params: EditToolParams
    ): string | null {
        // Validate new multi-replace format
        if (params.replacements) {
            if (params.replacements.length === 0) {
                return 'At least one replacement must be provided.';
            }
            for (const replacement of params.replacements) {
                if (!replacement.filePath) {
                    return 'Each replacement must have a filePath.';
                }
                if (!path.isAbsolute(replacement.filePath)) {
                    return `File path must be absolute: ${replacement.filePath}`;
                }
                if (replacement.oldString === undefined || replacement.newString === undefined) {
                    return 'Each replacement must have oldString and newString.';
                }
            }
            return null;
        }

        // Validate legacy single-replacement format
        if (!params.file_path) {
            return "The 'file_path' parameter must be non-empty.";
        }

        if (!path.isAbsolute(params.file_path)) {
            return `File path must be absolute: ${params.file_path}`;
        }

        return null;
    }

    protected createInvocation(
        params: EditToolParams
    ): ToolInvocation<EditToolParams, ToolResult> {
        return new EditToolInvocation(this.config, params);
    }

    getModifyContext(_: AbortSignal): ModifyContext<EditToolParams> {
        return {
            getFilePath: (params: EditToolParams) => {
                if (params.replacements && params.replacements.length > 0) {
                    return params.replacements[0].filePath;
                }
                return params.file_path ?? '';
            },
            getCurrentContent: async (
                params: EditToolParams
            ): Promise<string> => {
                const filePath = params.replacements && params.replacements.length > 0
                    ? params.replacements[0].filePath
                    : params.file_path;
                if (!filePath) return '';
                
                const fileExists = await isFilefileExists(filePath);
                if (fileExists) {
                    try {
                        const { content } = await this.config
                            .getFileSystemService()
                            .readTextFile({ path: filePath });
                        return content;
                    } catch (err) {
                        if (!isNodeError(err) || err.code !== 'ENOENT') {
                            throw err;
                        }
                        return '';
                    }
                } else {
                    return '';
                }
            },
            getProposedContent: async (
                params: EditToolParams
            ): Promise<string> => {
                const filePath = params.replacements && params.replacements.length > 0
                    ? params.replacements[0].filePath
                    : params.file_path;
                const oldString = params.replacements && params.replacements.length > 0
                    ? params.replacements[0].oldString
                    : params.old_string;
                const newString = params.replacements && params.replacements.length > 0
                    ? params.replacements[0].newString
                    : params.new_string;
                
                if (!filePath || oldString === undefined || newString === undefined) return '';
                
                if (fs.existsSync(filePath)) {
                    try {
                        const { content: currentContent } = await this.config
                            .getFileSystemService()
                            .readTextFile({ path: filePath });
                        return applyReplacement(
                            currentContent,
                            oldString,
                            newString,
                            oldString === '' && currentContent === ''
                        );
                    } catch (err) {
                        if (!isNodeError(err) || err.code !== 'ENOENT') {
                            throw err;
                        }
                        return '';
                    }
                } else {
                    return '';
                }
            },
            createUpdatedParams: (
                oldContent: string,
                modifiedProposedContent: string,
                originalParams: EditToolParams
            ): EditToolParams => {
                if (originalParams.replacements && originalParams.replacements.length > 0) {
                    return {
                        ...originalParams,
                        ai_proposed_content: oldContent,
                        replacements: [{
                            ...originalParams.replacements[0],
                            oldString: oldContent,
                            newString: modifiedProposedContent,
                            modified_by_user: true
                        }]
                    };
                }
                return {
                    ...originalParams,
                    ai_proposed_content: oldContent,
                    old_string: oldContent,
                    new_string: modifiedProposedContent,
                    modified_by_user: true
                };
            }
        };
    }
}
