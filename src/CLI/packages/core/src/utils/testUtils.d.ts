/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Check if we should simulate a 429 error for the current request
 */
export declare function shouldSimulate429(authType?: string): boolean;
/**
 * Reset the request counter (useful for tests)
 */
export declare function resetRequestCounter(): void;
/**
 * Disable 429 simulation after successful fallback
 */
export declare function disableSimulationAfterFallback(): void;
/**
 * Create a simulated 429 error response
 */
export declare function createSimulated429Error(): Error;
/**
 * Reset simulation state when switching auth methods
 */
export declare function resetSimulationState(): void;
/**
 * Enable/disable 429 simulation programmatically (for tests)
 */
export declare function setSimulate429(enabled: boolean, afterRequests?: number, forAuthType?: string): void;
