/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import type { GenerateContentParameters, ToolListUnion } from '@google/genai';
import { GenerateContentResponse } from '@google/genai';
import type OpenAI from 'openai';
import { type SchemaComplianceMode } from '../../utils/schemaConverter.js';
import type { InputModalities } from '../contentGenerator.js';
export interface ExtendedCompletionMessage extends OpenAI.Chat.ChatCompletionMessage {
    reasoning_content?: string | null;
    reasoning?: string | null;
}
export interface ExtendedCompletionChunkDelta extends OpenAI.Chat.ChatCompletionChunk.Choice.Delta {
    reasoning_content?: string | null;
    reasoning?: string | null;
}
/**
 * Tool call accumulator for streaming responses
 */
export interface ToolCallAccumulator {
    id?: string;
    name?: string;
    arguments: string;
}
/**
 * Converter class for transforming data between Gemini and OpenAI formats
 */
export declare class OpenAIContentConverter {
    private model;
    private schemaCompliance;
    private modalities;
    private streamingToolCallParser;
    constructor(model: string, schemaCompliance?: SchemaComplianceMode, modalities?: InputModalities);
    /**
     * Update the model used for response metadata (modelVersion/logging) and any
     * model-specific conversion behavior.
     */
    setModel(model: string): void;
    /**
     * Update the supported input modalities.
     */
    setModalities(modalities: InputModalities): void;
    /**
     * Reset streaming tool calls parser for new stream processing
     * This should be called at the beginning of each stream to prevent
     * data pollution from previous incomplete streams
     */
    resetStreamingToolCalls(): void;
    /**
     * Convert Gemini tool parameters to OpenAI JSON Schema format
     */
    convertGeminiToolParametersToOpenAI(parameters: Record<string, unknown>): Record<string, unknown> | undefined;
    /**
     * Convert Gemini tools to OpenAI format for API compatibility.
     * Handles both Gemini tools (using 'parameters' field) and MCP tools (using 'parametersJsonSchema' field).
     */
    convertGeminiToolsToOpenAI(geminiTools: ToolListUnion): Promise<OpenAI.Chat.ChatCompletionTool[]>;
    /**
     * Convert Gemini request to OpenAI message format
     */
    convertGeminiRequestToOpenAI(request: GenerateContentParameters, options?: {
        cleanOrphanToolCalls: boolean;
    }): OpenAI.Chat.ChatCompletionMessageParam[];
    /**
     * Convert Gemini response to OpenAI completion format (for logging).
     */
    convertGeminiResponseToOpenAI(response: GenerateContentResponse): OpenAI.Chat.ChatCompletion;
    /**
     * Extract and add system instruction message from request config
     */
    private addSystemInstructionMessage;
    /**
     * Process contents and convert to OpenAI messages
     */
    private processContents;
    /**
     * Process a single content item and convert to OpenAI message(s)
     */
    private processContent;
    private extractFunctionResponseContent;
    /**
     * Create a tool message from function response (with embedded media parts)
     */
    private createToolMessage;
    /**
     * Create OpenAI media content part from Gemini part.
     * Checks modality support before building each media type.
     */
    private createMediaContentPart;
    /**
     * Create a text placeholder for unsupported modalities.
     */
    private unsupportedModalityPlaceholder;
    /**
     * Determine media type from MIME type
     */
    private getMediaType;
    /**
     * Convert MIME type to OpenAI audio format
     */
    private getAudioFormat;
    /**
     * Type guard to check if content is a valid Content object
     */
    private isContentObject;
    /**
     * Extract text content from various Gemini content union types
     */
    private extractTextFromContentUnion;
    /**
     * Convert OpenAI response to Gemini format
     */
    convertOpenAIResponseToGemini(openaiResponse: OpenAI.Chat.ChatCompletion): GenerateContentResponse;
    /**
     * Convert OpenAI stream chunk to Gemini format
     */
    convertOpenAIChunkToGemini(chunk: OpenAI.Chat.ChatCompletionChunk): GenerateContentResponse;
    /**
     * Map OpenAI finish reasons to Gemini finish reasons
     */
    private mapOpenAIFinishReasonToGemini;
    private mapGeminiFinishReasonToOpenAI;
    /**
     * Clean up orphaned tool calls from message history to prevent OpenAI API errors
     */
    private cleanOrphanedToolCalls;
    /**
     * Merge consecutive assistant messages to combine split text and tool calls
     */
    private mergeConsecutiveAssistantMessages;
}
