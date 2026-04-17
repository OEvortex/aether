/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { z } from 'zod';
/**
 * A file that is open in the IDE.
 */
export declare const FileSchema: z.ZodObject<{
    /**
     * The absolute path to the file.
     */
    path: z.ZodString;
    /**
     * The unix timestamp of when the file was last focused.
     */
    timestamp: z.ZodNumber;
    /**
     * Whether the file is the currently active file. Only one file can be active at a time.
     */
    isActive: z.ZodOptional<z.ZodBoolean>;
    /**
     * The text that is currently selected in the active file.
     */
    selectedText: z.ZodOptional<z.ZodString>;
    /**
     * The cursor position in the active file.
     */
    cursor: z.ZodOptional<z.ZodObject<{
        /**
         * The 1-based line number.
         */
        line: z.ZodNumber;
        /**
         * The 1-based character offset.
         */
        character: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        line: number;
        character: number;
    }, {
        line: number;
        character: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    path: string;
    timestamp: number;
    cursor?: {
        line: number;
        character: number;
    } | undefined;
    isActive?: boolean | undefined;
    selectedText?: string | undefined;
}, {
    path: string;
    timestamp: number;
    cursor?: {
        line: number;
        character: number;
    } | undefined;
    isActive?: boolean | undefined;
    selectedText?: string | undefined;
}>;
export type File = z.infer<typeof FileSchema>;
/**
 * The context of the IDE.
 */
export declare const IdeContextSchema: z.ZodObject<{
    workspaceState: z.ZodOptional<z.ZodObject<{
        /**
         * The list of files that are currently open.
         */
        openFiles: z.ZodOptional<z.ZodArray<z.ZodObject<{
            /**
             * The absolute path to the file.
             */
            path: z.ZodString;
            /**
             * The unix timestamp of when the file was last focused.
             */
            timestamp: z.ZodNumber;
            /**
             * Whether the file is the currently active file. Only one file can be active at a time.
             */
            isActive: z.ZodOptional<z.ZodBoolean>;
            /**
             * The text that is currently selected in the active file.
             */
            selectedText: z.ZodOptional<z.ZodString>;
            /**
             * The cursor position in the active file.
             */
            cursor: z.ZodOptional<z.ZodObject<{
                /**
                 * The 1-based line number.
                 */
                line: z.ZodNumber;
                /**
                 * The 1-based character offset.
                 */
                character: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                line: number;
                character: number;
            }, {
                line: number;
                character: number;
            }>>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            timestamp: number;
            cursor?: {
                line: number;
                character: number;
            } | undefined;
            isActive?: boolean | undefined;
            selectedText?: string | undefined;
        }, {
            path: string;
            timestamp: number;
            cursor?: {
                line: number;
                character: number;
            } | undefined;
            isActive?: boolean | undefined;
            selectedText?: string | undefined;
        }>, "many">>;
        /**
         * Whether the workspace is trusted.
         */
        isTrusted: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        openFiles?: {
            path: string;
            timestamp: number;
            cursor?: {
                line: number;
                character: number;
            } | undefined;
            isActive?: boolean | undefined;
            selectedText?: string | undefined;
        }[] | undefined;
        isTrusted?: boolean | undefined;
    }, {
        openFiles?: {
            path: string;
            timestamp: number;
            cursor?: {
                line: number;
                character: number;
            } | undefined;
            isActive?: boolean | undefined;
            selectedText?: string | undefined;
        }[] | undefined;
        isTrusted?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    workspaceState?: {
        openFiles?: {
            path: string;
            timestamp: number;
            cursor?: {
                line: number;
                character: number;
            } | undefined;
            isActive?: boolean | undefined;
            selectedText?: string | undefined;
        }[] | undefined;
        isTrusted?: boolean | undefined;
    } | undefined;
}, {
    workspaceState?: {
        openFiles?: {
            path: string;
            timestamp: number;
            cursor?: {
                line: number;
                character: number;
            } | undefined;
            isActive?: boolean | undefined;
            selectedText?: string | undefined;
        }[] | undefined;
        isTrusted?: boolean | undefined;
    } | undefined;
}>;
export type IdeContext = z.infer<typeof IdeContextSchema>;
/**
 * A notification that the IDE context has been updated.
 */
export declare const IdeContextNotificationSchema: z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    method: z.ZodLiteral<"ide/contextUpdate">;
    params: z.ZodObject<{
        workspaceState: z.ZodOptional<z.ZodObject<{
            /**
             * The list of files that are currently open.
             */
            openFiles: z.ZodOptional<z.ZodArray<z.ZodObject<{
                /**
                 * The absolute path to the file.
                 */
                path: z.ZodString;
                /**
                 * The unix timestamp of when the file was last focused.
                 */
                timestamp: z.ZodNumber;
                /**
                 * Whether the file is the currently active file. Only one file can be active at a time.
                 */
                isActive: z.ZodOptional<z.ZodBoolean>;
                /**
                 * The text that is currently selected in the active file.
                 */
                selectedText: z.ZodOptional<z.ZodString>;
                /**
                 * The cursor position in the active file.
                 */
                cursor: z.ZodOptional<z.ZodObject<{
                    /**
                     * The 1-based line number.
                     */
                    line: z.ZodNumber;
                    /**
                     * The 1-based character offset.
                     */
                    character: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    line: number;
                    character: number;
                }, {
                    line: number;
                    character: number;
                }>>;
            }, "strip", z.ZodTypeAny, {
                path: string;
                timestamp: number;
                cursor?: {
                    line: number;
                    character: number;
                } | undefined;
                isActive?: boolean | undefined;
                selectedText?: string | undefined;
            }, {
                path: string;
                timestamp: number;
                cursor?: {
                    line: number;
                    character: number;
                } | undefined;
                isActive?: boolean | undefined;
                selectedText?: string | undefined;
            }>, "many">>;
            /**
             * Whether the workspace is trusted.
             */
            isTrusted: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            openFiles?: {
                path: string;
                timestamp: number;
                cursor?: {
                    line: number;
                    character: number;
                } | undefined;
                isActive?: boolean | undefined;
                selectedText?: string | undefined;
            }[] | undefined;
            isTrusted?: boolean | undefined;
        }, {
            openFiles?: {
                path: string;
                timestamp: number;
                cursor?: {
                    line: number;
                    character: number;
                } | undefined;
                isActive?: boolean | undefined;
                selectedText?: string | undefined;
            }[] | undefined;
            isTrusted?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        workspaceState?: {
            openFiles?: {
                path: string;
                timestamp: number;
                cursor?: {
                    line: number;
                    character: number;
                } | undefined;
                isActive?: boolean | undefined;
                selectedText?: string | undefined;
            }[] | undefined;
            isTrusted?: boolean | undefined;
        } | undefined;
    }, {
        workspaceState?: {
            openFiles?: {
                path: string;
                timestamp: number;
                cursor?: {
                    line: number;
                    character: number;
                } | undefined;
                isActive?: boolean | undefined;
                selectedText?: string | undefined;
            }[] | undefined;
            isTrusted?: boolean | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        workspaceState?: {
            openFiles?: {
                path: string;
                timestamp: number;
                cursor?: {
                    line: number;
                    character: number;
                } | undefined;
                isActive?: boolean | undefined;
                selectedText?: string | undefined;
            }[] | undefined;
            isTrusted?: boolean | undefined;
        } | undefined;
    };
    jsonrpc: "2.0";
    method: "ide/contextUpdate";
}, {
    params: {
        workspaceState?: {
            openFiles?: {
                path: string;
                timestamp: number;
                cursor?: {
                    line: number;
                    character: number;
                } | undefined;
                isActive?: boolean | undefined;
                selectedText?: string | undefined;
            }[] | undefined;
            isTrusted?: boolean | undefined;
        } | undefined;
    };
    jsonrpc: "2.0";
    method: "ide/contextUpdate";
}>;
/**
 * A notification that a diff has been accepted in the IDE.
 */
export declare const IdeDiffAcceptedNotificationSchema: z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    method: z.ZodLiteral<"ide/diffAccepted">;
    params: z.ZodObject<{
        /**
         * The absolute path to the file that was diffed.
         */
        filePath: z.ZodString;
        /**
         * The full content of the file after the diff was accepted, which includes any manual edits the user may have made.
         */
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        filePath: string;
        content: string;
    }, {
        filePath: string;
        content: string;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        filePath: string;
        content: string;
    };
    jsonrpc: "2.0";
    method: "ide/diffAccepted";
}, {
    params: {
        filePath: string;
        content: string;
    };
    jsonrpc: "2.0";
    method: "ide/diffAccepted";
}>;
/**
 * A notification that a diff has been rejected in the IDE.
 */
export declare const IdeDiffRejectedNotificationSchema: z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    method: z.ZodLiteral<"ide/diffRejected">;
    params: z.ZodObject<{
        /**
         * The absolute path to the file that was diffed.
         */
        filePath: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        filePath: string;
    }, {
        filePath: string;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        filePath: string;
    };
    jsonrpc: "2.0";
    method: "ide/diffRejected";
}, {
    params: {
        filePath: string;
    };
    jsonrpc: "2.0";
    method: "ide/diffRejected";
}>;
/**
 * This is defineded for backwards compatability only. Newer extension versions
 * will only send IdeDiffRejectedNotificationSchema.
 *
 * A notification that a diff has been closed in the IDE.
 */
export declare const IdeDiffClosedNotificationSchema: z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    method: z.ZodLiteral<"ide/diffClosed">;
    params: z.ZodObject<{
        filePath: z.ZodString;
        content: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        filePath: string;
        content?: string | undefined;
    }, {
        filePath: string;
        content?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    params: {
        filePath: string;
        content?: string | undefined;
    };
    jsonrpc: "2.0";
    method: "ide/diffClosed";
}, {
    params: {
        filePath: string;
        content?: string | undefined;
    };
    jsonrpc: "2.0";
    method: "ide/diffClosed";
}>;
/**
 * The request to open a diff view in the IDE.
 */
export declare const OpenDiffRequestSchema: z.ZodObject<{
    /**
     * The absolute path to the file to be diffed.
     */
    filePath: z.ZodString;
    /**
     * The proposed new content for the file.
     */
    newContent: z.ZodString;
}, "strip", z.ZodTypeAny, {
    filePath: string;
    newContent: string;
}, {
    filePath: string;
    newContent: string;
}>;
/**
 * The request to close a diff view in the IDE.
 */
export declare const CloseDiffRequestSchema: z.ZodObject<{
    /**
     * The absolute path to the file to be diffed.
     */
    filePath: z.ZodString;
    /**
     * @deprecated
     */
    suppressNotification: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    filePath: string;
    suppressNotification?: boolean | undefined;
}, {
    filePath: string;
    suppressNotification?: boolean | undefined;
}>;
