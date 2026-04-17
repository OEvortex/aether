/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Simple utility to validate objects against JSON Schemas.
 * Supports both draft-07 (default) and draft-2020-12 schemas.
 */
export declare class SchemaValidator {
    /**
     * Returns null if the data conforms to the schema described by schema (or if schema
     *  is null). Otherwise, returns a string describing the error.
     */
    static validate(schema: unknown | undefined, data: unknown): string | null;
}
