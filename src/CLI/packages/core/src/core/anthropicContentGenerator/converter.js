/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import { FinishReason, GenerateContentResponse } from '@google/genai';
import { safeJsonParse } from '../../utils/safeJsonParse.js';
import { convertSchema } from '../../utils/schemaConverter.js';
export class AnthropicContentConverter {
    model;
    schemaCompliance;
    enableCacheControl;
    constructor(model, schemaCompliance = 'auto', enableCacheControl = true) {
        this.model = model;
        this.schemaCompliance = schemaCompliance;
        this.enableCacheControl = enableCacheControl;
    }
    convertGeminiRequestToAnthropic(request) {
        const messages = [];
        const systemText = this.extractTextFromContentUnion(request.config?.systemInstruction);
        this.processContents(request.contents, messages);
        // Add cache_control to enable prompt caching (if enabled)
        const system = this.enableCacheControl
            ? this.buildSystemWithCacheControl(systemText)
            : systemText;
        if (this.enableCacheControl) {
            this.addCacheControlToMessages(messages);
        }
        return {
            system,
            messages
        };
    }
    async convertGeminiToolsToAnthropic(geminiTools) {
        const tools = [];
        for (const tool of geminiTools) {
            let actualTool;
            if ('tool' in tool) {
                actualTool = await tool.tool();
            }
            else {
                actualTool = tool;
            }
            if (!actualTool.functionDeclarations) {
                continue;
            }
            for (const func of actualTool.functionDeclarations) {
                // Skip functions without name or description (required by Anthropic API)
                if (!func.name || !func.description) {
                    continue;
                }
                let inputSchema;
                if (func.parametersJsonSchema) {
                    inputSchema = {
                        ...func.parametersJsonSchema
                    };
                }
                else if (func.parameters) {
                    inputSchema = func.parameters;
                }
                if (!inputSchema) {
                    inputSchema = { type: 'object', properties: {} };
                }
                inputSchema = convertSchema(inputSchema, this.schemaCompliance);
                if (typeof inputSchema.type !== 'string') {
                    inputSchema.type = 'object';
                }
                tools.push({
                    name: func.name,
                    description: func.description,
                    input_schema: inputSchema
                });
            }
        }
        // Add cache_control to the last tool for prompt caching (if enabled)
        if (this.enableCacheControl && tools.length > 0) {
            const lastToolIndex = tools.length - 1;
            tools[lastToolIndex] = {
                ...tools[lastToolIndex],
                cache_control: { type: 'ephemeral' }
            };
        }
        return tools;
    }
    convertAnthropicResponseToGemini(response) {
        const geminiResponse = new GenerateContentResponse();
        const parts = [];
        for (const block of response.content || []) {
            const blockType = String(block.type || '');
            if (blockType === 'text') {
                const text = typeof block.text === 'string'
                    ? block.text
                    : '';
                if (text) {
                    parts.push({ text });
                }
            }
            else if (blockType === 'tool_use') {
                const toolUse = block;
                parts.push({
                    functionCall: {
                        id: typeof toolUse.id === 'string'
                            ? toolUse.id
                            : undefined,
                        name: typeof toolUse.name === 'string'
                            ? toolUse.name
                            : undefined,
                        args: this.safeInputToArgs(toolUse.input)
                    }
                });
            }
            else if (blockType === 'thinking') {
                const thinking = typeof block.thinking ===
                    'string'
                    ? block.thinking
                    : '';
                const signature = typeof block.signature ===
                    'string'
                    ? block.signature
                    : '';
                if (thinking || signature) {
                    const thoughtPart = {
                        text: thinking,
                        thought: true,
                        thoughtSignature: signature
                    };
                    parts.push(thoughtPart);
                }
            }
            else if (blockType === 'redacted_thinking') {
                parts.push({ text: '', thought: true });
            }
        }
        const candidate = {
            content: {
                parts,
                role: 'model'
            },
            index: 0,
            safetyRatings: []
        };
        const finishReason = this.mapAnthropicFinishReasonToGemini(response.stop_reason);
        if (finishReason) {
            candidate.finishReason = finishReason;
        }
        geminiResponse.candidates = [candidate];
        geminiResponse.responseId = response.id;
        geminiResponse.createTime = Date.now().toString();
        geminiResponse.modelVersion = response.model || this.model;
        geminiResponse.promptFeedback = { safetyRatings: [] };
        if (response.usage) {
            const promptTokens = response.usage.input_tokens || 0;
            const completionTokens = response.usage.output_tokens || 0;
            geminiResponse.usageMetadata = {
                promptTokenCount: promptTokens,
                candidatesTokenCount: completionTokens,
                totalTokenCount: promptTokens + completionTokens
            };
        }
        return geminiResponse;
    }
    processContents(contents, messages) {
        if (Array.isArray(contents)) {
            for (const content of contents) {
                this.processContent(content, messages);
            }
        }
        else if (contents) {
            this.processContent(contents, messages);
        }
    }
    processContent(content, messages) {
        if (typeof content === 'string') {
            messages.push({
                role: 'user',
                content: [{ type: 'text', text: content }]
            });
            return;
        }
        if (!this.isContentObject(content)) {
            return;
        }
        const parts = content.parts || [];
        const role = content.role === 'model' ? 'assistant' : 'user';
        const contentBlocks = [];
        let toolCallIndex = 0;
        for (const part of parts) {
            if (typeof part === 'string') {
                contentBlocks.push({ type: 'text', text: part });
                continue;
            }
            if ('text' in part && 'thought' in part && part.thought) {
                if (role === 'assistant') {
                    const thinkingBlock = {
                        type: 'thinking',
                        thinking: part.text || ''
                    };
                    if ('thoughtSignature' in part &&
                        typeof part.thoughtSignature === 'string') {
                        thinkingBlock.signature =
                            part.thoughtSignature;
                    }
                    contentBlocks.push(thinkingBlock);
                }
            }
            if ('text' in part &&
                part.text &&
                !('thought' in part && part.thought)) {
                contentBlocks.push({ type: 'text', text: part.text });
            }
            const mediaBlock = this.createMediaBlockFromPart(part);
            if (mediaBlock) {
                contentBlocks.push(mediaBlock);
            }
            if ('functionCall' in part && part.functionCall) {
                if (role === 'assistant') {
                    contentBlocks.push({
                        type: 'tool_use',
                        id: part.functionCall.id || `tool_${toolCallIndex}`,
                        name: part.functionCall.name || '',
                        input: part.functionCall.args || {}
                    });
                    toolCallIndex += 1;
                }
            }
            if (part.functionResponse) {
                const toolResultBlock = this.createToolResultBlock(part.functionResponse);
                if (toolResultBlock && role === 'user') {
                    contentBlocks.push(toolResultBlock);
                }
            }
        }
        if (contentBlocks.length > 0) {
            messages.push({ role, content: contentBlocks });
        }
    }
    createToolResultBlock(response) {
        const textContent = this.extractFunctionResponseContent(response.response);
        const partBlocks = [];
        for (const part of response.parts || []) {
            const block = this.createMediaBlockFromPart(part);
            if (block) {
                partBlocks.push(block);
            }
        }
        let content;
        if (partBlocks.length > 0) {
            const blocks = [];
            if (textContent) {
                blocks.push({ type: 'text', text: textContent });
            }
            blocks.push(...partBlocks);
            content = blocks;
        }
        else {
            content = textContent;
        }
        return {
            type: 'tool_result',
            tool_use_id: response.id || '',
            content
        };
    }
    createMediaBlockFromPart(part) {
        if (part.inlineData?.mimeType && part.inlineData?.data) {
            if (this.isSupportedAnthropicImageMimeType(part.inlineData.mimeType)) {
                return {
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: part.inlineData.mimeType,
                        data: part.inlineData.data
                    }
                };
            }
            if (part.inlineData.mimeType === 'application/pdf') {
                return {
                    type: 'document',
                    source: {
                        type: 'base64',
                        media_type: 'application/pdf',
                        data: part.inlineData.data
                    }
                };
            }
            const displayName = part.inlineData.displayName
                ? ` (${part.inlineData.displayName})`
                : '';
            return {
                type: 'text',
                text: `Unsupported inline media type: ${part.inlineData.mimeType}${displayName}.`
            };
        }
        if (part.fileData?.mimeType && part.fileData?.fileUri) {
            const displayName = part.fileData.displayName
                ? ` (${part.fileData.displayName})`
                : '';
            const fileUri = part.fileData.fileUri;
            if (this.isSupportedAnthropicImageMimeType(part.fileData.mimeType)) {
                return {
                    type: 'image',
                    source: {
                        type: 'url',
                        url: fileUri
                    }
                };
            }
            if (part.fileData.mimeType === 'application/pdf') {
                return {
                    type: 'document',
                    source: {
                        type: 'url',
                        url: fileUri
                    }
                };
            }
            return {
                type: 'text',
                text: `Unsupported file media type: ${part.fileData.mimeType}${displayName}.`
            };
        }
        return null;
    }
    isSupportedAnthropicImageMimeType(mimeType) {
        return (mimeType === 'image/jpeg' ||
            mimeType === 'image/png' ||
            mimeType === 'image/gif' ||
            mimeType === 'image/webp');
    }
    extractTextFromContentUnion(contentUnion) {
        if (typeof contentUnion === 'string') {
            return contentUnion;
        }
        if (Array.isArray(contentUnion)) {
            return contentUnion
                .map((item) => this.extractTextFromContentUnion(item))
                .filter(Boolean)
                .join('\n');
        }
        if (typeof contentUnion === 'object' && contentUnion !== null) {
            if ('parts' in contentUnion) {
                const content = contentUnion;
                return (content.parts
                    ?.map((part) => {
                    if (typeof part === 'string') {
                        return part;
                    }
                    if ('text' in part) {
                        return part.text || '';
                    }
                    return '';
                })
                    .filter(Boolean)
                    .join('\n') || '');
            }
        }
        return '';
    }
    extractFunctionResponseContent(response) {
        if (response === null || response === undefined) {
            return '';
        }
        if (typeof response === 'string') {
            return response;
        }
        if (typeof response === 'object') {
            const responseObject = response;
            const output = responseObject.output;
            if (typeof output === 'string') {
                return output;
            }
            const error = responseObject.error;
            if (typeof error === 'string') {
                return error;
            }
        }
        try {
            const serialized = JSON.stringify(response);
            return serialized ?? String(response);
        }
        catch {
            return String(response);
        }
    }
    safeInputToArgs(input) {
        if (input && typeof input === 'object') {
            return input;
        }
        if (typeof input === 'string') {
            return safeJsonParse(input, {});
        }
        return {};
    }
    mapAnthropicFinishReasonToGemini(reason) {
        if (!reason) {
            return undefined;
        }
        const mapping = {
            end_turn: FinishReason.STOP,
            stop_sequence: FinishReason.STOP,
            tool_use: FinishReason.STOP,
            max_tokens: FinishReason.MAX_TOKENS,
            content_filter: FinishReason.SAFETY
        };
        return mapping[reason] || FinishReason.FINISH_REASON_UNSPECIFIED;
    }
    isContentObject(content) {
        return (typeof content === 'object' &&
            content !== null &&
            'role' in content &&
            'parts' in content &&
            Array.isArray(content.parts));
    }
    /**
     * Build system content blocks with cache_control.
     * Anthropic prompt caching requires cache_control on system content.
     */
    buildSystemWithCacheControl(systemText) {
        if (!systemText) {
            return systemText;
        }
        return [
            {
                type: 'text',
                text: systemText,
                cache_control: { type: 'ephemeral' }
            }
        ];
    }
    /**
     * Add cache_control to the last user message's content.
     * This enables prompt caching for the conversation context.
     */
    addCacheControlToMessages(messages) {
        // Find the last user message to add cache_control
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            if (msg.role === 'user') {
                const content = Array.isArray(msg.content)
                    ? msg.content
                    : [{ type: 'text', text: msg.content }];
                if (content.length > 0) {
                    const lastContent = content[content.length - 1];
                    // Only add cache_control if the last block is a non-empty text block
                    if (typeof lastContent === 'object' &&
                        'type' in lastContent &&
                        lastContent.type === 'text' &&
                        'text' in lastContent &&
                        lastContent.text) {
                        lastContent.cache_control = {
                            type: 'ephemeral'
                        };
                    }
                    // If last block is not text or is empty, don't add cache_control
                    msg.content = content;
                }
                break;
            }
        }
    }
}
//# sourceMappingURL=converter.js.map