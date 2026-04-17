/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Utility for converting JSON Schemas to be compatible with different LLM providers.
 * Specifically focuses on downgrading modern JSON Schema (Draft 7/2020-12) to
 * OpenAPI 3.0 compatible Schema Objects, which is required for Google Gemini API.
 */
export type SchemaComplianceMode = 'auto' | 'openapi_30';
/**
 * Converts a JSON Schema to be compatible with the specified compliance mode.
 */
export declare function convertSchema(schema: Record<string, unknown>, mode?: SchemaComplianceMode): Record<string, unknown>;
