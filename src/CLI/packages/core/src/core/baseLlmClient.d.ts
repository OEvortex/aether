/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Content, GenerateContentConfig, Part } from '@google/genai';
import type { Config } from '../config/config.js';
import type { ContentGenerator } from './contentGenerator.js';
/**
 * Options for the generateJson utility function.
 */
export interface GenerateJsonOptions {
    /** The input prompt or history. */
    contents: Content[];
    /** The required JSON schema for the output. */
    schema: Record<string, unknown>;
    /** The specific model to use for this task. */
    model: string;
    /**
     * Task-specific system instructions.
     * If omitted, no system instruction is sent.
     */
    systemInstruction?: string | Part | Part[] | Content;
    /**
     * Overrides for generation configuration (e.g., temperature).
     */
    config?: Omit<GenerateContentConfig, 'systemInstruction' | 'responseJsonSchema' | 'responseMimeType' | 'tools' | 'abortSignal'>;
    /** Signal for cancellation. */
    abortSignal: AbortSignal;
    /**
     * A unique ID for the prompt, used for logging/telemetry correlation.
     */
    promptId?: string;
    /**
     * The maximum number of attempts for the request.
     */
    maxAttempts?: number;
}
/**
 * A client dedicated to stateless, utility-focused LLM calls.
 */
export declare class BaseLlmClient {
    private readonly contentGenerator;
    private readonly config;
    constructor(contentGenerator: ContentGenerator, config: Config);
    generateJson(options: GenerateJsonOptions): Promise<Record<string, unknown>>;
    generateEmbedding(texts: string[]): Promise<number[][]>;
}
