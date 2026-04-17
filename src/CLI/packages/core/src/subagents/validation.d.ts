/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import type { RunConfig } from '../agents/runtime/agent-types.js';
import type { SubagentConfig, ValidationResult } from './types.js';
/**
 * Validates subagent configurations to ensure they are well-formed
 * and compatible with the runtime system.
 */
export declare class SubagentValidator {
    /**
     * Validates a complete subagent configuration.
     *
     * @param config - The subagent configuration to validate
     * @returns ValidationResult with errors and warnings
     */
    validateConfig(config: SubagentConfig): ValidationResult;
    /**
     * Validates a subagent name.
     * Names must be valid identifiers that can be used in file paths and tool calls.
     *
     * @param name - The name to validate
     * @returns ValidationResult
     */
    validateName(name: string): ValidationResult;
    /**
     * Validates a system prompt.
     *
     * @param prompt - The system prompt to validate
     * @returns ValidationResult
     */
    validateSystemPrompt(prompt: string): ValidationResult;
    /**
     * Validates a list of tool names.
     *
     * @param tools - Array of tool names to validate
     * @returns ValidationResult
     */
    validateTools(tools: string[]): ValidationResult;
    /**
     * Validates a subagent model selector.
     *
     * @param model - Model selector to validate
     * @returns ValidationResult
     */
    validateModel(model: string): ValidationResult;
    /**
     * Validates runtime configuration.
     *
     * @param runConfig - Partial run configuration to validate
     * @returns ValidationResult
     */
    validateRunConfig(runConfig: RunConfig): ValidationResult;
    /**
     * Throws a SubagentError if validation fails.
     *
     * @param config - Configuration to validate
     * @param subagentName - Name for error context
     * @throws SubagentError if validation fails
     */
    validateOrThrow(config: SubagentConfig, subagentName?: string): void;
}
