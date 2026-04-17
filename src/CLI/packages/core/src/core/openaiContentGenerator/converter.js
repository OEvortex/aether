/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import { FinishReason, GenerateContentResponse } from '@google/genai';
import { createDebugLogger } from '../../utils/debugLogger.js';
import { safeJsonParse } from '../../utils/safeJsonParse.js';
import { convertSchema } from '../../utils/schemaConverter.js';
import { StreamingToolCallParser } from './streamingToolCallParser.js';
const debugLogger = createDebugLogger('CONVERTER');
/**
 * Converter class for transforming data between Gemini and OpenAI formats
 */
export class OpenAIContentConverter {
    model;
    schemaCompliance;
    modalities;
    streamingToolCallParser = new StreamingToolCallParser();
    constructor(model, schemaCompliance = 'auto', modalities = {}) {
        this.model = model;
        this.schemaCompliance = schemaCompliance;
        this.modalities = modalities;
    }
    /**
     * Update the model used for response metadata (modelVersion/logging) and any
     * model-specific conversion behavior.
     */
    setModel(model) {
        this.model = model;
    }
    /**
     * Update the supported input modalities.
     */
    setModalities(modalities) {
        this.modalities = modalities;
    }
    /**
     * Reset streaming tool calls parser for new stream processing
     * This should be called at the beginning of each stream to prevent
     * data pollution from previous incomplete streams
     */
    resetStreamingToolCalls() {
        this.streamingToolCallParser.reset();
    }
    /**
     * Convert Gemini tool parameters to OpenAI JSON Schema format
     */
    convertGeminiToolParametersToOpenAI(parameters) {
        if (!parameters || typeof parameters !== 'object') {
            return parameters;
        }
        const converted = JSON.parse(JSON.stringify(parameters));
        const convertTypes = (obj) => {
            if (typeof obj !== 'object' || obj === null) {
                return obj;
            }
            if (Array.isArray(obj)) {
                return obj.map(convertTypes);
            }
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                if (key === 'type' && typeof value === 'string') {
                    // Convert Gemini types to OpenAI JSON Schema types
                    const lowerValue = value.toLowerCase();
                    if (lowerValue === 'integer') {
                        result[key] = 'integer';
                    }
                    else if (lowerValue === 'number') {
                        result[key] = 'number';
                    }
                    else {
                        result[key] = lowerValue;
                    }
                }
                else if (key === 'minimum' ||
                    key === 'maximum' ||
                    key === 'multipleOf') {
                    // Ensure numeric constraints are actual numbers, not strings
                    if (typeof value === 'string' &&
                        !Number.isNaN(Number(value))) {
                        result[key] = Number(value);
                    }
                    else {
                        result[key] = value;
                    }
                }
                else if (key === 'minLength' ||
                    key === 'maxLength' ||
                    key === 'minItems' ||
                    key === 'maxItems') {
                    // Ensure length constraints are integers, not strings
                    if (typeof value === 'string' &&
                        !Number.isNaN(Number(value))) {
                        result[key] = parseInt(value, 10);
                    }
                    else {
                        result[key] = value;
                    }
                }
                else if (typeof value === 'object') {
                    result[key] = convertTypes(value);
                }
                else {
                    result[key] = value;
                }
            }
            return result;
        };
        return convertTypes(converted);
    }
    /**
     * Convert Gemini tools to OpenAI format for API compatibility.
     * Handles both Gemini tools (using 'parameters' field) and MCP tools (using 'parametersJsonSchema' field).
     */
    async convertGeminiToolsToOpenAI(geminiTools) {
        const openAITools = [];
        for (const tool of geminiTools) {
            let actualTool;
            // Handle CallableTool vs Tool
            if ('tool' in tool) {
                // This is a CallableTool
                actualTool = await tool.tool();
            }
            else {
                // This is already a Tool
                actualTool = tool;
            }
            if (actualTool.functionDeclarations) {
                for (const func of actualTool.functionDeclarations) {
                    if (func.name && func.description) {
                        let parameters;
                        // Handle both Gemini tools (parameters) and MCP tools (parametersJsonSchema)
                        if (func.parametersJsonSchema) {
                            // MCP tool format - use parametersJsonSchema directly
                            // Create a shallow copy to avoid mutating the original object
                            const paramsCopy = {
                                ...func.parametersJsonSchema
                            };
                            parameters = paramsCopy;
                        }
                        else if (func.parameters) {
                            // Gemini tool format - convert parameters to OpenAI format
                            parameters =
                                this.convertGeminiToolParametersToOpenAI(func.parameters);
                        }
                        if (parameters) {
                            parameters = convertSchema(parameters, this.schemaCompliance);
                        }
                        openAITools.push({
                            type: 'function',
                            function: {
                                name: func.name,
                                description: func.description,
                                parameters
                            }
                        });
                    }
                }
            }
        }
        return openAITools;
    }
    /**
     * Convert Gemini request to OpenAI message format
     */
    convertGeminiRequestToOpenAI(request, options = {
        cleanOrphanToolCalls: true
    }) {
        let messages = [];
        // Handle system instruction from config
        this.addSystemInstructionMessage(request, messages);
        // Handle contents
        this.processContents(request.contents, messages);
        // Clean up orphaned tool calls and merge consecutive assistant messages
        if (options.cleanOrphanToolCalls) {
            messages = this.cleanOrphanedToolCalls(messages);
        }
        messages = this.mergeConsecutiveAssistantMessages(messages);
        return messages;
    }
    /**
     * Convert Gemini response to OpenAI completion format (for logging).
     */
    convertGeminiResponseToOpenAI(response) {
        const candidate = response.candidates?.[0];
        const parts = (candidate?.content?.parts || []);
        // Parse parts inline
        const thoughtParts = [];
        const contentParts = [];
        const toolCalls = [];
        let toolCallIndex = 0;
        for (const part of parts) {
            if (typeof part === 'string') {
                contentParts.push(part);
            }
            else if ('text' in part && part.text) {
                if ('thought' in part && part.thought) {
                    thoughtParts.push(part.text);
                }
                else {
                    contentParts.push(part.text);
                }
            }
            else if ('functionCall' in part && part.functionCall) {
                toolCalls.push({
                    id: part.functionCall.id || `call_${toolCallIndex}`,
                    type: 'function',
                    function: {
                        name: part.functionCall.name || '',
                        arguments: JSON.stringify(part.functionCall.args || {})
                    }
                });
                toolCallIndex += 1;
            }
        }
        const message = {
            role: 'assistant',
            content: contentParts.join('') || null,
            refusal: null
        };
        const reasoningContent = thoughtParts.join('');
        if (reasoningContent) {
            message.reasoning_content = reasoningContent;
        }
        if (toolCalls.length > 0) {
            message.tool_calls = toolCalls;
        }
        const finishReason = this.mapGeminiFinishReasonToOpenAI(candidate?.finishReason);
        const usageMetadata = response.usageMetadata;
        const usage = {
            prompt_tokens: usageMetadata?.promptTokenCount || 0,
            completion_tokens: usageMetadata?.candidatesTokenCount || 0,
            total_tokens: usageMetadata?.totalTokenCount || 0
        };
        if (usageMetadata?.cachedContentTokenCount !== undefined) {
            usage.prompt_tokens_details = {
                cached_tokens: usageMetadata.cachedContentTokenCount
            };
        }
        const createdMs = response.createTime
            ? Number(response.createTime)
            : Date.now();
        const createdSeconds = Number.isFinite(createdMs)
            ? Math.floor(createdMs / 1000)
            : Math.floor(Date.now() / 1000);
        return {
            id: response.responseId || `gemini-${Date.now()}`,
            object: 'chat.completion',
            created: createdSeconds,
            model: response.modelVersion || this.model,
            choices: [
                {
                    index: 0,
                    message,
                    finish_reason: finishReason,
                    logprobs: null
                }
            ],
            usage
        };
    }
    /**
     * Extract and add system instruction message from request config
     */
    addSystemInstructionMessage(request, messages) {
        if (!request.config?.systemInstruction) {
            return;
        }
        const systemText = this.extractTextFromContentUnion(request.config.systemInstruction);
        if (systemText) {
            messages.push({
                role: 'system',
                content: systemText
            });
        }
    }
    /**
     * Process contents and convert to OpenAI messages
     */
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
    /**
     * Process a single content item and convert to OpenAI message(s)
     */
    processContent(content, messages) {
        if (typeof content === 'string') {
            messages.push({ role: 'user', content });
            return;
        }
        if (!this.isContentObject(content)) {
            return;
        }
        const parts = content.parts || [];
        const role = content.role === 'model' ? 'assistant' : 'user';
        const contentParts = [];
        const reasoningParts = [];
        const toolCalls = [];
        let toolCallIndex = 0;
        for (const part of parts) {
            if (typeof part === 'string') {
                contentParts.push({ type: 'text', text: part });
                continue;
            }
            if ('text' in part && 'thought' in part && part.thought) {
                if (role === 'assistant' && part.text) {
                    reasoningParts.push(part.text);
                }
            }
            if ('text' in part &&
                part.text &&
                !('thought' in part && part.thought)) {
                contentParts.push({ type: 'text', text: part.text });
            }
            const mediaPart = this.createMediaContentPart(part);
            if (mediaPart && role === 'user') {
                contentParts.push(mediaPart);
            }
            if ('functionCall' in part &&
                part.functionCall &&
                role === 'assistant') {
                toolCalls.push({
                    id: part.functionCall.id || `call_${toolCallIndex}`,
                    type: 'function',
                    function: {
                        name: part.functionCall.name || '',
                        arguments: JSON.stringify(part.functionCall.args || {})
                    }
                });
                toolCallIndex += 1;
            }
            if (part.functionResponse && role === 'user') {
                // Create tool message for the function response (with embedded media)
                const toolMessage = this.createToolMessage(part.functionResponse);
                if (toolMessage) {
                    messages.push(toolMessage);
                }
            }
        }
        if (role === 'assistant') {
            if (contentParts.length === 0 &&
                toolCalls.length === 0 &&
                reasoningParts.length === 0) {
                return;
            }
            const assistantTextContent = contentParts
                .filter((part) => part.type === 'text')
                .map((part) => part.text)
                .join('');
            const assistantMessage = {
                role: 'assistant',
                content: assistantTextContent || null
            };
            if (toolCalls.length > 0) {
                assistantMessage.tool_calls = toolCalls;
            }
            const reasoningContent = reasoningParts.join('');
            if (reasoningContent) {
                assistantMessage.reasoning_content = reasoningContent;
            }
            messages.push(assistantMessage);
            return;
        }
        if (contentParts.length > 0) {
            messages.push({
                role: 'user',
                content: contentParts
            });
        }
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
    /**
     * Create a tool message from function response (with embedded media parts)
     */
    createToolMessage(response) {
        const textContent = this.extractFunctionResponseContent(response.response);
        const contentParts = [];
        // Add text content first if present
        if (textContent) {
            contentParts.push({ type: 'text', text: textContent });
        }
        // Add media parts from function response
        for (const part of response.parts || []) {
            const mediaPart = this.createMediaContentPart(part);
            if (mediaPart) {
                contentParts.push(mediaPart);
            }
        }
        // IMPORTANT: Always return a tool message, even if content is empty
        // OpenAI API requires that every tool call has a corresponding tool response
        // Empty tool results are valid (e.g., reading an empty file, successful operations with no output)
        if (contentParts.length === 0) {
            // Return empty string for empty tool results
            return {
                role: 'tool',
                tool_call_id: response.id || '',
                content: ''
            };
        }
        // Cast to OpenAI type - some OpenAI-compatible APIs support richer content in tool messages
        return {
            role: 'tool',
            tool_call_id: response.id || '',
            content: contentParts
        };
    }
    /**
     * Create OpenAI media content part from Gemini part.
     * Checks modality support before building each media type.
     */
    createMediaContentPart(part) {
        if (part.inlineData?.mimeType && part.inlineData?.data) {
            const mimeType = part.inlineData.mimeType;
            const mediaType = this.getMediaType(mimeType);
            const displayName = part.inlineData.displayName || mimeType;
            if (mediaType === 'image') {
                if (!this.modalities.image) {
                    return this.unsupportedModalityPlaceholder('image', displayName);
                }
                const dataUrl = `data:${mimeType};base64,${part.inlineData.data}`;
                return {
                    type: 'image_url',
                    image_url: { url: dataUrl }
                };
            }
            if (mimeType === 'application/pdf') {
                if (!this.modalities.pdf) {
                    return this.unsupportedModalityPlaceholder('pdf', displayName);
                }
                const filename = part.inlineData.displayName || 'document.pdf';
                return {
                    type: 'file',
                    file: {
                        filename,
                        file_data: `data:${mimeType};base64,${part.inlineData.data}`
                    }
                };
            }
            if (mediaType === 'audio') {
                if (!this.modalities.audio) {
                    return this.unsupportedModalityPlaceholder('audio', displayName);
                }
                const format = this.getAudioFormat(mimeType);
                if (format) {
                    return {
                        type: 'input_audio',
                        input_audio: {
                            data: `data:${mimeType};base64,${part.inlineData.data}`,
                            format
                        }
                    };
                }
            }
            if (mediaType === 'video') {
                if (!this.modalities.video) {
                    return this.unsupportedModalityPlaceholder('video', displayName);
                }
                return {
                    type: 'video_url',
                    video_url: {
                        url: `data:${mimeType};base64,${part.inlineData.data}`
                    }
                };
            }
            return {
                type: 'text',
                text: `Unsupported inline media type: ${mimeType} (${displayName}).`
            };
        }
        if (part.fileData?.mimeType && part.fileData?.fileUri) {
            const filename = part.fileData.displayName || 'file';
            const fileUri = part.fileData.fileUri;
            const mimeType = part.fileData.mimeType;
            const mediaType = this.getMediaType(mimeType);
            if (mediaType === 'image') {
                if (!this.modalities.image) {
                    return this.unsupportedModalityPlaceholder('image', filename);
                }
                return {
                    type: 'image_url',
                    image_url: { url: fileUri }
                };
            }
            if (mimeType === 'application/pdf') {
                if (!this.modalities.pdf) {
                    return this.unsupportedModalityPlaceholder('pdf', filename);
                }
                return {
                    type: 'file',
                    file: {
                        filename,
                        file_data: fileUri
                    }
                };
            }
            if (mediaType === 'video') {
                if (!this.modalities.video) {
                    return this.unsupportedModalityPlaceholder('video', filename);
                }
                return {
                    type: 'video_url',
                    video_url: {
                        url: fileUri
                    }
                };
            }
            const displayNameStr = part.fileData.displayName
                ? ` (${part.fileData.displayName})`
                : '';
            return {
                type: 'text',
                text: `Unsupported file media type: ${mimeType}${displayNameStr}.`
            };
        }
        return null;
    }
    /**
     * Create a text placeholder for unsupported modalities.
     */
    unsupportedModalityPlaceholder(modality, displayName) {
        debugLogger.warn(`Model '${this.model}' does not support ${modality} input. ` +
            `Replacing with text placeholder: ${displayName}`);
        let hint;
        if (modality === 'pdf') {
            hint =
                'This model does not support PDF input directly. The read_file tool cannot extract PDF content either. To extract text from the PDF file, try using skills if applicable, or guide user to install pdf skill by running this slash command:\n/extensions install https://github.com/anthropics/skills:document-skills';
        }
        else {
            hint = `This model does not support ${modality} input. The read_file tool cannot process this type of file either. To handle this file, try using skills if applicable, or any tools installed at system wide, or let the user know you cannot process this type of file.`;
        }
        return {
            type: 'text',
            text: `[Unsupported ${modality} file: "${displayName}". ${hint}]`
        };
    }
    /**
     * Determine media type from MIME type
     */
    getMediaType(mimeType) {
        if (mimeType.startsWith('image/')) {
            return 'image';
        }
        if (mimeType.startsWith('audio/')) {
            return 'audio';
        }
        if (mimeType.startsWith('video/')) {
            return 'video';
        }
        return 'file';
    }
    /**
     * Convert MIME type to OpenAI audio format
     */
    getAudioFormat(mimeType) {
        if (mimeType.includes('wav')) {
            return 'wav';
        }
        if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
            return 'mp3';
        }
        return null;
    }
    /**
     * Type guard to check if content is a valid Content object
     */
    isContentObject(content) {
        return (typeof content === 'object' &&
            content !== null &&
            'role' in content &&
            'parts' in content &&
            Array.isArray(content.parts));
    }
    /**
     * Extract text content from various Gemini content union types
     */
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
    /**
     * Convert OpenAI response to Gemini format
     */
    convertOpenAIResponseToGemini(openaiResponse) {
        const choice = openaiResponse.choices?.[0];
        const response = new GenerateContentResponse();
        if (choice) {
            const parts = [];
            // Handle reasoning content (thoughts)
            const reasoningText = choice.message
                .reasoning_content ??
                choice.message.reasoning;
            if (reasoningText) {
                parts.push({ text: reasoningText, thought: true });
            }
            // Handle text content
            if (choice.message.content) {
                parts.push({ text: choice.message.content });
            }
            // Handle tool calls
            if (choice.message.tool_calls) {
                for (const toolCall of choice.message.tool_calls) {
                    if (toolCall.function) {
                        let args = {};
                        if (toolCall.function.arguments) {
                            args = safeJsonParse(toolCall.function.arguments, {});
                        }
                        parts.push({
                            functionCall: {
                                id: toolCall.id,
                                name: toolCall.function.name,
                                args
                            }
                        });
                    }
                }
            }
            response.candidates = [
                {
                    content: {
                        parts,
                        role: 'model'
                    },
                    finishReason: this.mapOpenAIFinishReasonToGemini(choice.finish_reason || 'stop'),
                    index: 0,
                    safetyRatings: []
                }
            ];
        }
        else {
            response.candidates = [];
        }
        response.responseId = openaiResponse.id;
        response.createTime = openaiResponse.created
            ? openaiResponse.created.toString()
            : Date.now().toString();
        response.modelVersion = this.model;
        response.promptFeedback = { safetyRatings: [] };
        // Add usage metadata if available
        if (openaiResponse.usage) {
            const usage = openaiResponse.usage;
            const promptTokens = usage.prompt_tokens || 0;
            const completionTokens = usage.completion_tokens || 0;
            const totalTokens = usage.total_tokens || 0;
            // Support both formats: prompt_tokens_details.cached_tokens (OpenAI standard)
            // and cached_tokens (some models return it at top level)
            const extendedUsage = usage;
            const cachedTokens = usage.prompt_tokens_details?.cached_tokens ??
                extendedUsage.cached_tokens ??
                0;
            const thinkingTokens = usage.completion_tokens_details?.reasoning_tokens || 0;
            // If we only have total tokens but no breakdown, estimate the split
            // Typically input is ~70% and output is ~30% for most conversations
            let finalPromptTokens = promptTokens;
            let finalCompletionTokens = completionTokens;
            if (totalTokens > 0 &&
                promptTokens === 0 &&
                completionTokens === 0) {
                // Estimate: assume 70% input, 30% output
                finalPromptTokens = Math.round(totalTokens * 0.7);
                finalCompletionTokens = Math.round(totalTokens * 0.3);
            }
            response.usageMetadata = {
                promptTokenCount: finalPromptTokens,
                candidatesTokenCount: finalCompletionTokens,
                totalTokenCount: totalTokens,
                cachedContentTokenCount: cachedTokens,
                thoughtsTokenCount: thinkingTokens
            };
        }
        return response;
    }
    /**
     * Convert OpenAI stream chunk to Gemini format
     */
    convertOpenAIChunkToGemini(chunk) {
        const choice = chunk.choices?.[0];
        const response = new GenerateContentResponse();
        if (choice) {
            const parts = [];
            const reasoningText = choice.delta
                ?.reasoning_content ??
                choice.delta?.reasoning;
            if (reasoningText) {
                parts.push({ text: reasoningText, thought: true });
            }
            // Handle text content
            if (choice.delta?.content) {
                if (typeof choice.delta.content === 'string') {
                    parts.push({ text: choice.delta.content });
                }
            }
            // Handle tool calls using the streaming parser
            if (choice.delta?.tool_calls) {
                for (const toolCall of choice.delta.tool_calls) {
                    const index = toolCall.index ?? 0;
                    // Process the tool call chunk through the streaming parser
                    if (toolCall.function?.arguments) {
                        this.streamingToolCallParser.addChunk(index, toolCall.function.arguments, toolCall.id, toolCall.function.name);
                    }
                    else {
                        // Handle metadata-only chunks (id and/or name without arguments)
                        this.streamingToolCallParser.addChunk(index, '', // Empty chunk for metadata-only updates
                        toolCall.id, toolCall.function?.name);
                    }
                }
            }
            // Only emit function calls when streaming is complete (finish_reason is present)
            let toolCallsTruncated = false;
            if (choice.finish_reason) {
                // Detect truncation the provider may not report correctly.
                // Some providers (e.g. DashScope/Qwen) send "stop" or "tool_calls"
                // even when output was cut off mid-JSON due to max_tokens.
                toolCallsTruncated =
                    this.streamingToolCallParser.hasIncompleteToolCalls();
                const completedToolCalls = this.streamingToolCallParser.getCompletedToolCalls();
                for (const toolCall of completedToolCalls) {
                    if (toolCall.name) {
                        parts.push({
                            functionCall: {
                                id: toolCall.id ||
                                    `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                                name: toolCall.name,
                                args: toolCall.args
                            }
                        });
                    }
                }
                // Clear the parser for the next stream
                this.streamingToolCallParser.reset();
            }
            // If tool call JSON was truncated, override to "length" so downstream
            // (turn.ts) correctly sets wasOutputTruncated=true.
            const effectiveFinishReason = toolCallsTruncated && choice.finish_reason !== 'length'
                ? 'length'
                : choice.finish_reason;
            // Only include finishReason key if finish_reason is present
            const candidate = {
                content: {
                    parts,
                    role: 'model'
                },
                index: 0,
                safetyRatings: []
            };
            if (effectiveFinishReason) {
                candidate.finishReason = this.mapOpenAIFinishReasonToGemini(effectiveFinishReason);
            }
            response.candidates = [candidate];
        }
        else {
            response.candidates = [];
        }
        response.responseId = chunk.id;
        response.createTime = chunk.created
            ? chunk.created.toString()
            : Date.now().toString();
        response.modelVersion = this.model;
        response.promptFeedback = { safetyRatings: [] };
        // Add usage metadata if available in the chunk
        if (chunk.usage) {
            const usage = chunk.usage;
            const promptTokens = usage.prompt_tokens || 0;
            const completionTokens = usage.completion_tokens || 0;
            const totalTokens = usage.total_tokens || 0;
            const thinkingTokens = usage.completion_tokens_details?.reasoning_tokens || 0;
            // Support both formats: prompt_tokens_details.cached_tokens (OpenAI standard)
            // and cached_tokens (some models return it at top level)
            const extendedUsage = usage;
            const cachedTokens = usage.prompt_tokens_details?.cached_tokens ??
                extendedUsage.cached_tokens ??
                0;
            // If we only have total tokens but no breakdown, estimate the split
            // Typically input is ~70% and output is ~30% for most conversations
            let finalPromptTokens = promptTokens;
            let finalCompletionTokens = completionTokens;
            if (totalTokens > 0 &&
                promptTokens === 0 &&
                completionTokens === 0) {
                // Estimate: assume 70% input, 30% output
                finalPromptTokens = Math.round(totalTokens * 0.7);
                finalCompletionTokens = Math.round(totalTokens * 0.3);
            }
            response.usageMetadata = {
                promptTokenCount: finalPromptTokens,
                candidatesTokenCount: finalCompletionTokens,
                thoughtsTokenCount: thinkingTokens,
                totalTokenCount: totalTokens,
                cachedContentTokenCount: cachedTokens
            };
        }
        return response;
    }
    /**
     * Map OpenAI finish reasons to Gemini finish reasons
     */
    mapOpenAIFinishReasonToGemini(openaiReason) {
        if (!openaiReason) {
            return FinishReason.FINISH_REASON_UNSPECIFIED;
        }
        const mapping = {
            stop: FinishReason.STOP,
            length: FinishReason.MAX_TOKENS,
            content_filter: FinishReason.SAFETY,
            function_call: FinishReason.STOP,
            tool_calls: FinishReason.STOP
        };
        return mapping[openaiReason] || FinishReason.FINISH_REASON_UNSPECIFIED;
    }
    mapGeminiFinishReasonToOpenAI(geminiReason) {
        if (!geminiReason) {
            return 'stop';
        }
        switch (geminiReason) {
            case FinishReason.STOP:
                return 'stop';
            case FinishReason.MAX_TOKENS:
                return 'length';
            case FinishReason.SAFETY:
                return 'content_filter';
            default:
                if (geminiReason === 'RECITATION') {
                    return 'content_filter';
                }
                return 'stop';
        }
    }
    /**
     * Clean up orphaned tool calls from message history to prevent OpenAI API errors
     */
    cleanOrphanedToolCalls(messages) {
        const cleaned = [];
        const toolCallIds = new Set();
        const toolResponseIds = new Set();
        // First pass: collect all tool call IDs and tool response IDs
        for (const message of messages) {
            if (message.role === 'assistant' &&
                'tool_calls' in message &&
                message.tool_calls) {
                for (const toolCall of message.tool_calls) {
                    if (toolCall.id) {
                        toolCallIds.add(toolCall.id);
                    }
                }
            }
            else if (message.role === 'tool' &&
                'tool_call_id' in message &&
                message.tool_call_id) {
                toolResponseIds.add(message.tool_call_id);
            }
        }
        // Second pass: filter out orphaned messages
        for (const message of messages) {
            if (message.role === 'assistant' &&
                'tool_calls' in message &&
                message.tool_calls) {
                // Filter out tool calls that don't have corresponding responses
                const validToolCalls = message.tool_calls.filter((toolCall) => toolCall.id && toolResponseIds.has(toolCall.id));
                if (validToolCalls.length > 0) {
                    // Keep the message but only with valid tool calls
                    const cleanedMessage = { ...message };
                    cleanedMessage.tool_calls = validToolCalls;
                    cleaned.push(cleanedMessage);
                }
                else if (typeof message.content === 'string' &&
                    message.content.trim()) {
                    // Keep the message if it has text content, but remove tool calls
                    const cleanedMessage = { ...message };
                    delete cleanedMessage.tool_calls;
                    cleaned.push(cleanedMessage);
                }
                // If no valid tool calls and no content, skip the message entirely
            }
            else if (message.role === 'tool' &&
                'tool_call_id' in message &&
                message.tool_call_id) {
                // Only keep tool responses that have corresponding tool calls
                if (toolCallIds.has(message.tool_call_id)) {
                    cleaned.push(message);
                }
            }
            else {
                // Keep all other messages as-is
                cleaned.push(message);
            }
        }
        // Final validation: ensure every assistant message with tool_calls has corresponding tool responses
        const finalCleaned = [];
        const finalToolCallIds = new Set();
        // Collect all remaining tool call IDs
        for (const message of cleaned) {
            if (message.role === 'assistant' &&
                'tool_calls' in message &&
                message.tool_calls) {
                for (const toolCall of message.tool_calls) {
                    if (toolCall.id) {
                        finalToolCallIds.add(toolCall.id);
                    }
                }
            }
        }
        // Verify all tool calls have responses
        const finalToolResponseIds = new Set();
        for (const message of cleaned) {
            if (message.role === 'tool' &&
                'tool_call_id' in message &&
                message.tool_call_id) {
                finalToolResponseIds.add(message.tool_call_id);
            }
        }
        // Remove any remaining orphaned tool calls
        for (const message of cleaned) {
            if (message.role === 'assistant' &&
                'tool_calls' in message &&
                message.tool_calls) {
                const finalValidToolCalls = message.tool_calls.filter((toolCall) => toolCall.id && finalToolResponseIds.has(toolCall.id));
                if (finalValidToolCalls.length > 0) {
                    const cleanedMessage = { ...message };
                    cleanedMessage.tool_calls = finalValidToolCalls;
                    finalCleaned.push(cleanedMessage);
                }
                else if (typeof message.content === 'string' &&
                    message.content.trim()) {
                    const cleanedMessage = { ...message };
                    delete cleanedMessage.tool_calls;
                    finalCleaned.push(cleanedMessage);
                }
            }
            else {
                finalCleaned.push(message);
            }
        }
        return finalCleaned;
    }
    /**
     * Merge consecutive assistant messages to combine split text and tool calls
     */
    mergeConsecutiveAssistantMessages(messages) {
        const merged = [];
        for (const message of messages) {
            if (message.role === 'assistant' && merged.length > 0) {
                const lastMessage = merged[merged.length - 1];
                // If the last message is also an assistant message, merge them
                if (lastMessage.role === 'assistant') {
                    const lastToolCalls = 'tool_calls' in lastMessage
                        ? lastMessage.tool_calls || []
                        : [];
                    const currentToolCalls = 'tool_calls' in message ? message.tool_calls || [] : [];
                    // Combine content
                    const lastContent = lastMessage.content;
                    const currentContent = message.content;
                    // Determine if we should use array format (if either content is an array)
                    const useArrayFormat = Array.isArray(lastContent) ||
                        Array.isArray(currentContent);
                    let combinedContent;
                    if (useArrayFormat) {
                        // Convert both to array format and merge
                        const lastParts = Array.isArray(lastContent)
                            ? lastContent
                            : typeof lastContent === 'string' && lastContent
                                ? [{ type: 'text', text: lastContent }]
                                : [];
                        const currentParts = Array.isArray(currentContent)
                            ? currentContent
                            : typeof currentContent === 'string' &&
                                currentContent
                                ? [
                                    {
                                        type: 'text',
                                        text: currentContent
                                    }
                                ]
                                : [];
                        combinedContent = [
                            ...lastParts,
                            ...currentParts
                        ];
                    }
                    else {
                        // Both are strings or null, merge as strings
                        const lastText = typeof lastContent === 'string' ? lastContent : '';
                        const currentText = typeof currentContent === 'string'
                            ? currentContent
                            : '';
                        const mergedText = [lastText, currentText]
                            .filter(Boolean)
                            .join('');
                        combinedContent = mergedText || null;
                    }
                    // Combine tool calls
                    const combinedToolCalls = [
                        ...lastToolCalls,
                        ...currentToolCalls
                    ];
                    // Update the last message with combined data
                    lastMessage.content = combinedContent || null;
                    if (combinedToolCalls.length > 0) {
                        lastMessage.tool_calls = combinedToolCalls;
                    }
                    continue; // Skip adding the current message since it's been merged
                }
            }
            // Add the message as-is if no merging is needed
            merged.push(message);
        }
        return merged;
    }
}
//# sourceMappingURL=converter.js.map