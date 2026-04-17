/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
import type { PermissionDecision } from '../permissions/types.js';
import type { ToolAskUserQuestionConfirmationDetails, ToolResult } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation } from './tools.js';
export interface QuestionOption {
    label: string;
    description: string;
}
export interface Question {
    question: string;
    header: string;
    options: QuestionOption[];
    multiSelect: boolean;
}
export interface AskUserQuestionParams {
    questions: Question[];
    metadata?: {
        source?: string;
    };
}
declare class AskUserQuestionToolInvocation extends BaseToolInvocation<AskUserQuestionParams, ToolResult> {
    private readonly _config;
    private userAnswers;
    private wasAnswered;
    constructor(_config: Config, params: AskUserQuestionParams);
    getDescription(): string;
    /**
     * ask_user_question always requires user confirmation so the user can
     * provide answers. In non-interactive mode without ACP support, we skip
     * confirmation (and subsequently skip execution).
     */
    getDefaultPermission(): Promise<PermissionDecision>;
    getConfirmationDetails(_abortSignal: AbortSignal): Promise<ToolAskUserQuestionConfirmationDetails>;
    execute(_signal: AbortSignal): Promise<ToolResult>;
}
export declare class AskUserQuestionTool extends BaseDeclarativeTool<AskUserQuestionParams, ToolResult> {
    private readonly config;
    static readonly Name: string;
    constructor(config: Config);
    validateToolParams(params: AskUserQuestionParams): string | null;
    protected createInvocation(params: AskUserQuestionParams): AskUserQuestionToolInvocation;
}
export {};
