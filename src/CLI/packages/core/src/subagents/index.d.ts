/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Subagents — file-based configuration layer.
 *
 * This module provides the foundation for the subagents feature by implementing
 * a file-based configuration system that builds on the agent runtime.
 *
 */
export { BuiltinAgentRegistry } from './builtin-agents.js';
export { SubagentManager } from './subagent-manager.js';
export type { CreateSubagentOptions, ListSubagentsOptions, SubagentConfig, SubagentErrorCode, SubagentLevel, SubagentRuntimeConfig, ValidationResult } from './types.js';
export { SubagentError } from './types.js';
export { SubagentValidator } from './validation.js';
