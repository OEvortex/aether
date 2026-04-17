/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import Anthropic from '@anthropic-ai/sdk';
import { GenerateContentResponse } from '@google/genai';
import { createDebugLogger } from '../../utils/debugLogger.js';
import { DEFAULT_CONTEXT_LENGTH, DEFAULT_MAX_OUTPUT_TOKENS, hasExplicitOutputLimit, resolveGlobalTokenLimits } from '../../utils/globalContextLengthManager.js';
import { RequestTokenEstimator } from '../../utils/request-tokenizer/index.js';
import { buildRuntimeFetchOptions } from '../../utils/runtimeFetchOptions.js';
import { safeJsonParse } from '../../utils/safeJsonParse.js';
import { DEFAULT_TIMEOUT } from '../openaiContentGenerator/constants.js';
import { AnthropicContentConverter } from './converter.js';
const debugLogger = createDebugLogger('ANTHROPIC');
export class AnthropicContentGenerator {
    contentGeneratorConfig;
    cliConfig;
    client;
    converter;
    constructor(contentGeneratorConfig, cliConfig) {
        this.contentGeneratorConfig = contentGeneratorConfig;
        this.cliConfig = cliConfig;
        const defaultHeaders = this.buildHeaders();
        const baseURL = contentGeneratorConfig.baseUrl;
        // Configure runtime options to ensure user-configured timeout works as expected
        // bodyTimeout is always disabled (0) to let Anthropic SDK timeout control the request
        const runtimeOptions = buildRuntimeFetchOptions('anthropic', this.cliConfig.getProxy());
        this.client = new Anthropic({
            apiKey: contentGeneratorConfig.apiKey,
            baseURL,
            timeout: contentGeneratorConfig.timeout || DEFAULT_TIMEOUT,
            maxRetries: contentGeneratorConfig.maxRetries,
            defaultHeaders,
            ...runtimeOptions
        });
        this.converter = new AnthropicContentConverter(contentGeneratorConfig.model, contentGeneratorConfig.schemaCompliance, contentGeneratorConfig.enableCacheControl);
    }
    async generateContent(request) {
        const anthropicRequest = await this.buildRequest(request);
        const response = (await this.client.messages.create(anthropicRequest, {
            signal: request.config?.abortSignal
        }));
        return this.converter.convertAnthropicResponseToGemini(response);
    }
    async generateContentStream(request) {
        const anthropicRequest = await this.buildRequest(request);
        const streamingRequest = {
            ...anthropicRequest,
            stream: true
        };
        const stream = (await this.client.messages.create(streamingRequest, {
            signal: request.config?.abortSignal
        }));
        return this.processStream(stream);
    }
    async countTokens(request) {
        try {
            const estimator = new RequestTokenEstimator();
            const result = await estimator.calculateTokens(request);
            return {
                totalTokens: result.totalTokens
            };
        }
        catch (error) {
            debugLogger.warn('Failed to calculate tokens with tokenizer, ' +
                'falling back to simple method:', error);
            const content = JSON.stringify(request.contents);
            const totalTokens = Math.ceil(content.length / 4);
            return {
                totalTokens
            };
        }
    }
    async embedContent(_request) {
        throw new Error('Anthropic does not support embeddings.');
    }
    useSummarizedThinking() {
        return false;
    }
    buildHeaders() {
        const version = this.cliConfig.getCliVersion() || 'unknown';
        const userAgent = `AetherCode/${version} (${process.platform}; ${process.arch})`;
        const { customHeaders } = this.contentGeneratorConfig;
        const betas = [];
        const reasoning = this.contentGeneratorConfig.reasoning;
        // Interleaved thinking is used when we send the `thinking` field.
        if (reasoning !== false) {
            betas.push('interleaved-thinking-2025-05-14');
        }
        // Effort (beta) is enabled when reasoning.effort is set.
        if (reasoning !== false && reasoning?.effort !== undefined) {
            betas.push('effort-2025-11-24');
        }
        const headers = {
            'User-Agent': userAgent
        };
        if (betas.length) {
            headers['anthropic-beta'] = betas.join(',');
        }
        return customHeaders ? { ...headers, ...customHeaders } : headers;
    }
    async buildRequest(request) {
        const { system, messages } = this.converter.convertGeminiRequestToAnthropic(request);
        const tools = request.config?.tools
            ? await this.converter.convertGeminiToolsToAnthropic(request.config.tools)
            : undefined;
        const sampling = this.buildSamplingParameters(request);
        const thinking = this.buildThinkingConfig(request);
        const outputConfig = this.buildOutputConfig();
        return {
            model: this.contentGeneratorConfig.model,
            system,
            messages,
            tools,
            ...sampling,
            ...(thinking ? { thinking } : {}),
            ...(outputConfig ? { output_config: outputConfig } : {})
        };
    }
    buildSamplingParameters(request) {
        const configSamplingParams = this.contentGeneratorConfig.samplingParams;
        const requestConfig = request.config || {};
        const getParam = (configKey, requestKey) => {
            const configValue = configSamplingParams?.[configKey];
            const requestValue = requestKey
                ? requestConfig[requestKey]
                : undefined;
            return configValue !== undefined ? configValue : requestValue;
        };
        // Apply output token limit logic consistent with OpenAI providers
        const userMaxTokens = getParam('max_tokens', 'maxOutputTokens');
        const modelId = this.contentGeneratorConfig.model;
        const { maxOutputTokens: modelLimit } = resolveGlobalTokenLimits(modelId, DEFAULT_CONTEXT_LENGTH, {
            defaultContextLength: DEFAULT_CONTEXT_LENGTH,
            defaultMaxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS
        });
        const isKnownModel = hasExplicitOutputLimit(modelId);
        const maxTokens = userMaxTokens !== undefined && userMaxTokens !== null
            ? isKnownModel
                ? Math.min(userMaxTokens, modelLimit)
                : userMaxTokens
            : Math.min(modelLimit, DEFAULT_MAX_OUTPUT_TOKENS);
        return {
            max_tokens: maxTokens,
            temperature: getParam('temperature', 'temperature') ?? 1,
            top_p: getParam('top_p', 'topP'),
            top_k: getParam('top_k', 'topK')
        };
    }
    buildThinkingConfig(request) {
        if (request.config?.thinkingConfig?.includeThoughts === false) {
            return undefined;
        }
        const reasoning = this.contentGeneratorConfig.reasoning;
        if (reasoning === false) {
            return undefined;
        }
        if (reasoning?.budget_tokens !== undefined) {
            return {
                type: 'enabled',
                budget_tokens: reasoning.budget_tokens
            };
        }
        const effort = reasoning?.effort;
        // When using interleaved thinking with tools, this budget token limit is the entire context window(200k tokens).
        const budgetTokens = effort === 'low' ? 16_000 : effort === 'high' ? 64_000 : 32_000;
        return {
            type: 'enabled',
            budget_tokens: budgetTokens
        };
    }
    buildOutputConfig() {
        const reasoning = this.contentGeneratorConfig.reasoning;
        if (reasoning === false || reasoning === undefined) {
            return undefined;
        }
        if (reasoning.effort === undefined) {
            return undefined;
        }
        return { effort: reasoning.effort };
    }
    async *processStream(stream) {
        let messageId;
        let model = this.contentGeneratorConfig.model;
        let cachedTokens = 0;
        let promptTokens = 0;
        let completionTokens = 0;
        let finishReason;
        const blocks = new Map();
        const collectedResponses = [];
        for await (const event of stream) {
            switch (event.type) {
                case 'message_start': {
                    messageId = event.message.id ?? messageId;
                    model = event.message.model ?? model;
                    cachedTokens =
                        event.message.usage?.cache_read_input_tokens ??
                            cachedTokens;
                    promptTokens =
                        event.message.usage?.input_tokens ?? promptTokens;
                    break;
                }
                case 'content_block_start': {
                    const index = event.index ?? 0;
                    const type = String(event.content_block.type || 'text');
                    const initialInput = type === 'tool_use' && 'input' in event.content_block
                        ? JSON.stringify(event.content_block.input)
                        : '';
                    blocks.set(index, {
                        type,
                        id: 'id' in event.content_block
                            ? event.content_block.id
                            : undefined,
                        name: 'name' in event.content_block
                            ? event.content_block.name
                            : undefined,
                        inputJson: initialInput !== '{}' ? initialInput : '',
                        signature: type === 'thinking' &&
                            'signature' in event.content_block &&
                            typeof event.content_block.signature === 'string'
                            ? event.content_block.signature
                            : ''
                    });
                    break;
                }
                case 'content_block_delta': {
                    const index = event.index ?? 0;
                    const deltaType = event.delta.type || '';
                    const blockState = blocks.get(index);
                    if (deltaType === 'text_delta') {
                        const text = 'text' in event.delta ? event.delta.text : '';
                        if (text) {
                            const chunk = this.buildGeminiChunk({ text }, messageId, model);
                            collectedResponses.push(chunk);
                            yield chunk;
                        }
                    }
                    else if (deltaType === 'thinking_delta') {
                        const thinking = event.delta.thinking ||
                            '';
                        if (thinking) {
                            const chunk = this.buildGeminiChunk({ text: thinking, thought: true }, messageId, model);
                            collectedResponses.push(chunk);
                            yield chunk;
                        }
                    }
                    else if (deltaType === 'signature_delta' && blockState) {
                        const signature = event.delta.signature ||
                            '';
                        if (signature) {
                            blockState.signature += signature;
                            const chunk = this.buildGeminiChunk({ thought: true, thoughtSignature: signature }, messageId, model);
                            collectedResponses.push(chunk);
                            yield chunk;
                        }
                    }
                    else if (deltaType === 'input_json_delta' && blockState) {
                        const jsonDelta = event.delta
                            .partial_json || '';
                        if (jsonDelta) {
                            blockState.inputJson += jsonDelta;
                        }
                    }
                    break;
                }
                case 'content_block_stop': {
                    const index = event.index ?? 0;
                    const blockState = blocks.get(index);
                    if (blockState?.type === 'tool_use') {
                        const args = safeJsonParse(blockState.inputJson || '{}', {});
                        const chunk = this.buildGeminiChunk({
                            functionCall: {
                                id: blockState.id,
                                name: blockState.name,
                                args
                            }
                        }, messageId, model);
                        collectedResponses.push(chunk);
                        yield chunk;
                    }
                    blocks.delete(index);
                    break;
                }
                case 'message_delta': {
                    const stopReasonValue = event.delta.stop_reason;
                    if (stopReasonValue) {
                        finishReason = stopReasonValue;
                    }
                    // Some Anthropic-compatible providers may include additional usage fields
                    // (e.g. `input_tokens`, `cache_read_input_tokens`) even though the official
                    // Anthropic SDK types only expose `output_tokens` here.
                    const usageUnknown = event.usage;
                    const usageRecord = usageUnknown && typeof usageUnknown === 'object'
                        ? usageUnknown
                        : undefined;
                    if (event.usage?.output_tokens !== undefined) {
                        completionTokens = event.usage.output_tokens;
                    }
                    if (usageRecord?.input_tokens !== undefined) {
                        const inputTokens = usageRecord.input_tokens;
                        if (typeof inputTokens === 'number') {
                            promptTokens = inputTokens;
                        }
                    }
                    if (usageRecord?.cache_read_input_tokens !== undefined) {
                        const cacheRead = usageRecord.cache_read_input_tokens;
                        if (typeof cacheRead === 'number') {
                            cachedTokens = cacheRead;
                        }
                    }
                    if (finishReason || event.usage) {
                        const chunk = this.buildGeminiChunk(undefined, messageId, model, finishReason, {
                            cachedContentTokenCount: cachedTokens,
                            promptTokenCount: cachedTokens + promptTokens,
                            candidatesTokenCount: completionTokens,
                            totalTokenCount: cachedTokens +
                                promptTokens +
                                completionTokens
                        });
                        collectedResponses.push(chunk);
                        yield chunk;
                    }
                    break;
                }
                case 'message_stop': {
                    if (promptTokens || completionTokens) {
                        const chunk = this.buildGeminiChunk(undefined, messageId, model, finishReason, {
                            cachedContentTokenCount: cachedTokens,
                            promptTokenCount: cachedTokens + promptTokens,
                            candidatesTokenCount: completionTokens,
                            totalTokenCount: cachedTokens +
                                promptTokens +
                                completionTokens
                        });
                        collectedResponses.push(chunk);
                        yield chunk;
                    }
                    break;
                }
                default:
                    break;
            }
        }
    }
    buildGeminiChunk(part, responseId, model, finishReason, usageMetadata) {
        const response = new GenerateContentResponse();
        response.responseId = responseId;
        response.createTime = Date.now().toString();
        response.modelVersion = model || this.contentGeneratorConfig.model;
        response.promptFeedback = { safetyRatings: [] };
        const candidateParts = part ? [part] : [];
        const mappedFinishReason = finishReason !== undefined
            ? this.converter.mapAnthropicFinishReasonToGemini(finishReason)
            : undefined;
        response.candidates = [
            {
                content: {
                    parts: candidateParts,
                    role: 'model'
                },
                index: 0,
                safetyRatings: [],
                ...(mappedFinishReason
                    ? { finishReason: mappedFinishReason }
                    : {})
            }
        ];
        if (usageMetadata) {
            response.usageMetadata = usageMetadata;
        }
        return response;
    }
}
//# sourceMappingURL=anthropicContentGenerator.js.map