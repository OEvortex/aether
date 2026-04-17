/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI } from '@google/genai';
/**
 * A wrapper for GoogleGenAI that implements the ContentGenerator interface.
 */
export class GeminiContentGenerator {
    googleGenAI;
    contentGeneratorConfig;
    constructor(options, contentGeneratorConfig) {
        const customHeaders = contentGeneratorConfig?.customHeaders;
        const finalOptions = customHeaders
            ? (() => {
                const baseHttpOptions = options.httpOptions;
                const baseHeaders = baseHttpOptions?.headers ?? {};
                return {
                    ...options,
                    httpOptions: {
                        ...(baseHttpOptions ?? {}),
                        headers: {
                            ...baseHeaders,
                            ...customHeaders
                        }
                    }
                };
            })()
            : options;
        this.googleGenAI = new GoogleGenAI(finalOptions);
        this.contentGeneratorConfig = contentGeneratorConfig;
    }
    buildGenerateContentConfig(request) {
        const configSamplingParams = this.contentGeneratorConfig?.samplingParams;
        const requestConfig = request.config || {};
        // Helper function to get parameter value with priority: config > request > default
        const getParameterValue = (configValue, requestKey, defaultValue) => {
            const requestValue = requestConfig[requestKey];
            if (configValue !== undefined) {
                return configValue;
            }
            if (requestValue !== undefined) {
                return requestValue;
            }
            return defaultValue;
        };
        return {
            ...requestConfig,
            temperature: getParameterValue(configSamplingParams?.temperature, 'temperature', 1),
            topP: getParameterValue(configSamplingParams?.top_p, 'topP', 0.95),
            topK: getParameterValue(configSamplingParams?.top_k, 'topK', 64),
            maxOutputTokens: getParameterValue(configSamplingParams?.max_tokens, 'maxOutputTokens'),
            presencePenalty: getParameterValue(configSamplingParams?.presence_penalty, 'presencePenalty'),
            frequencyPenalty: getParameterValue(configSamplingParams?.frequency_penalty, 'frequencyPenalty'),
            thinkingConfig: getParameterValue(this.buildThinkingConfig(), 'thinkingConfig', {
                includeThoughts: true,
                thinkingLevel: 'THINKING_LEVEL_UNSPECIFIED'
            })
        };
    }
    buildThinkingConfig() {
        const reasoning = this.contentGeneratorConfig?.reasoning;
        if (reasoning === false) {
            return { includeThoughts: false };
        }
        if (reasoning) {
            const thinkingLevel = (reasoning.effort === 'low'
                ? 'LOW'
                : reasoning.effort === 'high'
                    ? 'HIGH'
                    : 'THINKING_LEVEL_UNSPECIFIED');
            return {
                includeThoughts: true,
                thinkingLevel
            };
        }
        return undefined;
    }
    async generateContent(request, _userPromptId) {
        const finalRequest = {
            ...request,
            contents: this.stripUnsupportedFields(request.contents),
            config: this.buildGenerateContentConfig(request)
        };
        return this.googleGenAI.models.generateContent(finalRequest);
    }
    async generateContentStream(request, _userPromptId) {
        const finalRequest = {
            ...request,
            contents: this.stripUnsupportedFields(request.contents),
            config: this.buildGenerateContentConfig(request)
        };
        return this.googleGenAI.models.generateContentStream(finalRequest);
    }
    /**
     * Strip fields not supported by Gemini API (e.g., displayName in inlineData/fileData)
     */
    stripUnsupportedFields(contents) {
        if (!contents) {
            return contents;
        }
        if (typeof contents === 'string') {
            return contents;
        }
        if (Array.isArray(contents)) {
            return contents.map((content) => this.stripContentFields(content));
        }
        return this.stripContentFields(contents);
    }
    stripContentFields(content) {
        if (typeof content === 'string') {
            return content;
        }
        // Handle Part directly (for arrays of parts)
        if (!('role' in content) && !('parts' in content)) {
            return this.stripPartFields(content);
        }
        // Handle Content object
        const contentObj = content;
        if (!contentObj.parts) {
            return contentObj;
        }
        return {
            ...contentObj,
            parts: contentObj.parts.map((part) => this.stripPartFields(part))
        };
    }
    stripPartFields(part) {
        if (typeof part === 'string') {
            return part;
        }
        const result = { ...part };
        // Strip displayName from inlineData
        if (result.inlineData) {
            const { displayName: _, ...inlineDataWithoutDisplayName } = result.inlineData;
            result.inlineData =
                inlineDataWithoutDisplayName;
        }
        // Strip displayName from fileData
        if (result.fileData) {
            const { displayName: _, ...fileDataWithoutDisplayName } = result.fileData;
            result.fileData = fileDataWithoutDisplayName;
        }
        // Handle functionResponse parts (which may contain nested media parts)
        // Convert unsupported media types (audio, video) to text for Gemini API
        if (result.functionResponse?.parts) {
            const processedParts = result.functionResponse.parts.map((p) => {
                // First convert unsupported media to text (before stripping displayName)
                const converted = this.convertUnsupportedMediaToText(p);
                // Then strip unsupported fields from remaining parts
                return this.stripPartFields(converted);
            });
            result.functionResponse = {
                ...result.functionResponse,
                parts: processedParts
            };
        }
        return result;
    }
    /**
     * Convert unsupported media types (audio, video) to explanatory text for Gemini API
     */
    convertUnsupportedMediaToText(part) {
        if (typeof part === 'string') {
            return part;
        }
        const inlineMimeType = part.inlineData?.mimeType || '';
        const fileMimeType = part.fileData?.mimeType || '';
        if (inlineMimeType.startsWith('audio/') ||
            inlineMimeType.startsWith('video/')) {
            const displayName = part.inlineData
                ?.displayName;
            const displayNameText = displayName ? ` (${displayName})` : '';
            return {
                text: `Unsupported media type for Gemini: ${inlineMimeType}${displayNameText}.`
            };
        }
        if (fileMimeType.startsWith('audio/') ||
            fileMimeType.startsWith('video/')) {
            const displayName = part.fileData
                ?.displayName;
            const displayNameText = displayName ? ` (${displayName})` : '';
            return {
                text: `Unsupported media type for Gemini: ${fileMimeType}${displayNameText}.`
            };
        }
        return part;
    }
    async countTokens(request) {
        return this.googleGenAI.models.countTokens(request);
    }
    async embedContent(request) {
        return this.googleGenAI.models.embedContent(request);
    }
    useSummarizedThinking() {
        return true;
    }
}
//# sourceMappingURL=geminiContentGenerator.js.map