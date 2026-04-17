/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
export function getMCPServerPrompts(config, serverName) {
    const promptRegistry = config.getPromptRegistry();
    if (!promptRegistry) {
        return [];
    }
    return promptRegistry.getPromptsByServer(serverName);
}
//# sourceMappingURL=mcp-prompts.js.map