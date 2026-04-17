/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { DiscoveredMCPPrompt } from '../tools/mcp-client.js';
export declare class PromptRegistry {
    private prompts;
    /**
     * Registers a prompt definition.
     * @param prompt - The prompt object containing schema and execution logic.
     */
    registerPrompt(prompt: DiscoveredMCPPrompt): void;
    /**
     * Returns an array of all registered and discovered prompt instances.
     */
    getAllPrompts(): DiscoveredMCPPrompt[];
    /**
     * Get the definition of a specific prompt.
     */
    getPrompt(name: string): DiscoveredMCPPrompt | undefined;
    /**
     * Returns an array of prompts registered from a specific MCP server.
     */
    getPromptsByServer(serverName: string): DiscoveredMCPPrompt[];
    /**
     * Clears all the prompts from the registry.
     */
    clear(): void;
    /**
     * Removes all prompts from a specific server.
     */
    removePromptsByServer(serverName: string): void;
}
