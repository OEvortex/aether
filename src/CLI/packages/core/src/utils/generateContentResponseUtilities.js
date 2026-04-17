/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { getResponseText } from './partUtils.js';
export function getResponseTextFromParts(parts) {
    if (!parts) {
        return undefined;
    }
    const textSegments = parts
        .map((part) => part.text)
        .filter((text) => typeof text === 'string');
    if (textSegments.length === 0) {
        return undefined;
    }
    return textSegments.join('');
}
export function getFunctionCalls(response) {
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
        return undefined;
    }
    const functionCallParts = parts
        .filter((part) => !!part.functionCall)
        .map((part) => part.functionCall);
    // Handle special case: model returns two tool_calls where first has name but no args,
    // and second has no name but has args. Merge them together.
    if (functionCallParts.length === 2) {
        const [first, second] = functionCallParts;
        const firstHasNameOnly = first.name && (!first.args || Object.keys(first.args).length === 0);
        const secondHasArgsOnly = !second.name && second.args && Object.keys(second.args).length > 0;
        if (firstHasNameOnly && secondHasArgsOnly) {
            return [
                {
                    name: first.name,
                    args: second.args
                }
            ];
        }
    }
    return functionCallParts.length > 0 ? functionCallParts : undefined;
}
export function getFunctionCallsFromParts(parts) {
    if (!parts) {
        return undefined;
    }
    const functionCallParts = parts
        .filter((part) => !!part.functionCall)
        .map((part) => part.functionCall);
    return functionCallParts.length > 0 ? functionCallParts : undefined;
}
export function getFunctionCallsAsJson(response) {
    const functionCalls = getFunctionCalls(response);
    if (!functionCalls) {
        return undefined;
    }
    return JSON.stringify(functionCalls, null, 2);
}
export function getFunctionCallsFromPartsAsJson(parts) {
    const functionCalls = getFunctionCallsFromParts(parts);
    if (!functionCalls) {
        return undefined;
    }
    return JSON.stringify(functionCalls, null, 2);
}
export function getStructuredResponse(response) {
    const textContent = getResponseText(response);
    const functionCallsJson = getFunctionCallsAsJson(response);
    if (textContent && functionCallsJson) {
        return `${textContent}\n${functionCallsJson}`;
    }
    if (textContent) {
        return textContent;
    }
    if (functionCallsJson) {
        return functionCallsJson;
    }
    return undefined;
}
export function getStructuredResponseFromParts(parts) {
    const textContent = getResponseTextFromParts(parts);
    const functionCallsJson = getFunctionCallsFromPartsAsJson(parts);
    if (textContent && functionCallsJson) {
        return `${textContent}\n${functionCallsJson}`;
    }
    if (textContent) {
        return textContent;
    }
    if (functionCallsJson) {
        return functionCallsJson;
    }
    return undefined;
}
//# sourceMappingURL=generateContentResponseUtilities.js.map