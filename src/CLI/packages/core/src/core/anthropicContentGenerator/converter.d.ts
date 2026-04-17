/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import type Anthropic from '@anthropic-ai/sdk';
import type { GenerateContentParameters, ToolListUnion } from '@google/genai';
import { FinishReason, GenerateContentResponse } from '@google/genai';
import { type SchemaComplianceMode } from '../../utils/schemaConverter.js';
type AnthropicMessageParam = Anthropic.MessageParam;
type AnthropicToolParam = Anthropic.Tool & {
    cache_control?: {
        type: 'ephemeral';
    };
};
export declare class AnthropicContentConverter {
    private model;
    private schemaCompliance;
    private enableCacheControl;
    constructor(model: string, schemaCompliance?: SchemaComplianceMode, enableCacheControl?: boolean);
    convertGeminiRequestToAnthropic(request: GenerateContentParameters): {
        system?: Anthropic.TextBlockParam[] | string;
        messages: AnthropicMessageParam[];
    };
    convertGeminiToolsToAnthropic(geminiTools: ToolListUnion): Promise<AnthropicToolParam[]>;
    convertAnthropicResponseToGemini(response: Anthropic.Message): GenerateContentResponse;
    private processContents;
    private processContent;
    private createToolResultBlock;
    private createMediaBlockFromPart;
    private isSupportedAnthropicImageMimeType;
    private extractTextFromContentUnion;
    private extractFunctionResponseContent;
    private safeInputToArgs;
    mapAnthropicFinishReasonToGemini(reason?: string | null): FinishReason | undefined;
    private isContentObject;
    /**
     * Build system content blocks with cache_control.
     * Anthropic prompt caching requires cache_control on system content.
     */
    private buildSystemWithCacheControl;
    /**
     * Add cache_control to the last user message's content.
     * This enables prompt caching for the conversation context.
     */
    private addCacheControlToMessages;
}
export {};
