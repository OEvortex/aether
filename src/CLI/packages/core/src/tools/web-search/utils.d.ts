/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Utility functions for web search formatting and processing.
 */
/**
 * Build content string with appended sources section.
 * @param content Main content text
 * @param sources Array of source objects
 * @returns Combined content with sources
 */
export declare function buildContentWithSources(content: string, sources: Array<{
    title: string;
    url: string;
}>): string;
/**
 * Build a concise summary from top search results.
 * @param sources Array of source objects
 * @param maxResults Maximum number of results to include
 * @returns Concise summary string
 */
export declare function buildSummary(sources: Array<{
    title: string;
    url: string;
}>, maxResults?: number): string;
