/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { GenerateContentResponse, PartListUnion, PartUnion } from '@google/genai';
/**
 * Converts a PartListUnion into a string.
 * If verbose is true, includes summary representations of non-text parts.
 */
export declare function partToString(value: PartListUnion, options?: {
    verbose?: boolean;
}): string;
export declare function getResponseText(response: GenerateContentResponse): string | null;
/**
 * Asynchronously maps over a PartListUnion, applying a transformation function
 * to the text content of each text-based part.
 *
 * @param parts The PartListUnion to process.
 * @param transform A function that takes a string of text and returns a Promise
 *   resolving to an array of new PartUnions.
 * @returns A Promise that resolves to a new array of PartUnions with the
 *   transformations applied.
 */
export declare function flatMapTextParts(parts: PartListUnion, transform: (text: string) => Promise<PartUnion[]>): Promise<PartUnion[]>;
/**
 * Appends a string of text to the last text part of a prompt, or adds a new
 * text part if the last part is not a text part.
 *
 * @param prompt The prompt to modify.
 * @param textToAppend The text to append to the prompt.
 * @param separator The separator to add between existing text and the new text.
 * @returns The modified prompt.
 */
export declare function appendToLastTextPart(prompt: PartUnion[], textToAppend: string, separator?: string): PartUnion[];
