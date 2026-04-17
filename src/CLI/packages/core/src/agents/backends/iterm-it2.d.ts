/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
export declare function isIt2Available(): boolean;
export declare function ensureIt2Installed(): Promise<void>;
export declare function verifyITerm(): Promise<void>;
export declare function itermSplitPane(sessionId?: string): Promise<string>;
export declare function itermRunCommand(sessionId: string, command: string): Promise<void>;
export declare function itermFocusSession(sessionId: string): Promise<void>;
export declare function itermSendText(sessionId: string, text: string): Promise<void>;
export declare function itermCloseSession(sessionId: string): Promise<void>;
