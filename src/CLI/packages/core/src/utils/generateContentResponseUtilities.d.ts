/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { FunctionCall, GenerateContentResponse, Part } from '@google/genai';
export declare function getResponseTextFromParts(parts: Part[]): string | undefined;
export declare function getFunctionCalls(response: GenerateContentResponse): FunctionCall[] | undefined;
export declare function getFunctionCallsFromParts(parts: Part[]): FunctionCall[] | undefined;
export declare function getFunctionCallsAsJson(response: GenerateContentResponse): string | undefined;
export declare function getFunctionCallsFromPartsAsJson(parts: Part[]): string | undefined;
export declare function getStructuredResponse(response: GenerateContentResponse): string | undefined;
export declare function getStructuredResponseFromParts(parts: Part[]): string | undefined;
