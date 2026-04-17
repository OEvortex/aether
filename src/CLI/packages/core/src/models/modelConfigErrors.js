/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
export function getDefaultApiKeyEnvVar(authType) {
    switch (authType) {
        case 'openai':
            return 'OPENAI_API_KEY';
        case 'anthropic':
            return 'ANTHROPIC_API_KEY';
        case 'gemini':
            return 'GEMINI_API_KEY';
        case 'vertex-ai':
            return 'GOOGLE_API_KEY';
        default:
            return 'API_KEY';
    }
}
export function getDefaultModelEnvVar(authType) {
    switch (authType) {
        case 'openai':
            return 'OPENAI_MODEL';
        case 'anthropic':
            return 'ANTHROPIC_MODEL';
        case 'gemini':
            return 'GEMINI_MODEL';
        case 'vertex-ai':
            return 'GOOGLE_MODEL';
        default:
            return 'MODEL';
    }
}
export class ModelConfigError extends Error {
    constructor(message) {
        super(message);
        this.name = new.target.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class StrictMissingCredentialsError extends ModelConfigError {
    code = 'STRICT_MISSING_CREDENTIALS';
    constructor(_authType, model, envKey) {
        const modelName = model || '(unknown)';
        super(`Missing credentials for model '${modelName}'. ` +
            (envKey
                ? `Current configured envKey: '${envKey}'. Set that environment variable, or configure the provider in settings.`
                : `Configure the provider in settings and set the required API key.`));
    }
}
export class StrictMissingModelIdError extends ModelConfigError {
    code = 'STRICT_MISSING_MODEL_ID';
    constructor(authType) {
        super(`Missing model id for strict provider resolution (authType: ${authType}).`);
    }
}
export class MissingApiKeyError extends ModelConfigError {
    code = 'MISSING_API_KEY';
    constructor(params) {
        super(`Missing API key for ${params.authType} auth. ` +
            `Current model: '${params.model || '(unknown)'}', baseUrl: '${params.baseUrl || '(default)'}'. ` +
            `Provide an API key via settings (security.auth.apiKey), ` +
            `or set the environment variable '${params.envKey}'.`);
    }
}
export class MissingModelError extends ModelConfigError {
    code = 'MISSING_MODEL';
    constructor(params) {
        super(`Missing model for ${params.authType} auth. ` +
            `Set the environment variable '${params.envKey}'.`);
    }
}
export class MissingBaseUrlError extends ModelConfigError {
    code = 'MISSING_BASE_URL';
    constructor(params) {
        super(`Missing baseUrl for model '${params.model || '(unknown)'}'. ` +
            `Configure the provider in settings with the correct baseUrl.`);
    }
}
export class MissingAnthropicBaseUrlEnvError extends ModelConfigError {
    code = 'MISSING_ANTHROPIC_BASE_URL_ENV';
    constructor() {
        super('ANTHROPIC_BASE_URL environment variable not found.');
    }
}
//# sourceMappingURL=modelConfigErrors.js.map