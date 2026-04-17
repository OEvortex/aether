/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
const AUTH_TYPES = new Set([
    'openai',
    'aether-oauth',
    'gemini',
    'vertex-ai',
    'anthropic'
]);
/**
 * Parse a subagent model selector.
 *
 * Supported forms:
 * - omitted / inherit -> use parent conversation model
 * - modelId -> use parent authType with the provided modelId
 * - authType:modelId -> use explicit authType and modelId
 */
export function parseSubagentModelSelection(model) {
    const trimmed = model?.trim();
    if (!trimmed || trimmed === 'inherit') {
        return { inherits: true };
    }
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) {
        return { modelId: trimmed, inherits: false };
    }
    const maybeAuthType = trimmed.slice(0, colonIndex).trim();
    const modelId = trimmed.slice(colonIndex + 1).trim();
    // If the prefix isn't a known AuthType, treat the whole string as a bare
    // model ID. Model IDs can legitimately contain colons (e.g. gpt-4o:online).
    if (!AUTH_TYPES.has(maybeAuthType)) {
        return { modelId: trimmed, inherits: false };
    }
    if (!modelId) {
        throw new Error('Model selector must include a model ID after the authType');
    }
    return {
        authType: maybeAuthType,
        modelId,
        inherits: false
    };
}
//# sourceMappingURL=model-selection.js.map