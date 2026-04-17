/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
export declare function getDefaultApiKeyEnvVar(authType: string | undefined): string;
export declare function getDefaultModelEnvVar(authType: string | undefined): string;
export declare abstract class ModelConfigError extends Error {
    abstract readonly code: string;
    protected constructor(message: string);
}
export declare class StrictMissingCredentialsError extends ModelConfigError {
    readonly code = "STRICT_MISSING_CREDENTIALS";
    constructor(_authType: string | undefined, model: string | undefined, envKey?: string);
}
export declare class StrictMissingModelIdError extends ModelConfigError {
    readonly code = "STRICT_MISSING_MODEL_ID";
    constructor(authType: string | undefined);
}
export declare class MissingApiKeyError extends ModelConfigError {
    readonly code = "MISSING_API_KEY";
    constructor(params: {
        authType: string | undefined;
        model: string | undefined;
        baseUrl: string | undefined;
        envKey: string;
    });
}
export declare class MissingModelError extends ModelConfigError {
    readonly code = "MISSING_MODEL";
    constructor(params: {
        authType: string | undefined;
        envKey: string;
    });
}
export declare class MissingBaseUrlError extends ModelConfigError {
    readonly code = "MISSING_BASE_URL";
    constructor(params: {
        authType: string | undefined;
        model: string | undefined;
    });
}
export declare class MissingAnthropicBaseUrlEnvError extends ModelConfigError {
    readonly code = "MISSING_ANTHROPIC_BASE_URL_ENV";
    constructor();
}
