/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Content, Part } from '@google/genai';
import type { Config } from '../config/config.js';
/**
 * Generates a string describing the current workspace directories and their structures.
 * @param {Config} config - The runtime configuration and services.
 * @returns {Promise<string>} A promise that resolves to the directory context string.
 */
export declare function getDirectoryContextString(config: Config): Promise<string>;
/**
 * Retrieves environment-related information to be included in the chat context.
 * This includes the current working directory, date, operating system, and folder structure.
 * @param {Config} config - The runtime configuration and services.
 * @returns A promise that resolves to an array of `Part` objects containing environment information.
 */
export declare function getEnvironmentContext(config: Config): Promise<Part[]>;
export declare function getInitialChatHistory(config: Config, extraHistory?: Content[]): Promise<Content[]>;
/**
 * Strip the leading startup context (env-info user message + model ack)
 * from a chat history. Used when forwarding a parent session's history
 * to a child agent that will generate its own startup context for its
 * own working directory.
 */
export declare function stripStartupContext(history: Content[]): Content[];
