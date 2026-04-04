// SDK Core Types - Common serializable types used by both SDK consumers and SDK builders.
//
// Types are generated from Zod schemas in coreSchemas.ts.
// To modify types:
// 1. Edit Zod schemas in coreSchemas.ts
// 2. Run: bun scripts/generate-sdk-types.ts
//
// Schemas are available in coreSchemas.ts for runtime validation but are not
// part of the public API.

// Re-export sandbox types for SDK consumers
export type {
    SandboxFilesystemConfig,
    SandboxIgnoreViolations,
    SandboxNetworkConfig,
    SandboxSettings
} from '../sandboxTypes.js';
// Re-export all generated types
export * from './coreTypes.generated.js';

// Re-export utility types that can't be expressed as Zod schemas
export type { NonNullableUsage } from './sdkUtilityTypes.js';

// Const arrays for runtime usage
export const HOOK_EVENTS = [
    'PreToolUse',
    'PostToolUse',
    'PostToolUseFailure',
    'Notification',
    'UserPromptSubmit',
    'SessionStart',
    'SessionEnd',
    'Stop',
    'StopFailure',
    'SubagentStart',
    'SubagentStop',
    'PreCompact',
    'PostCompact',
    'PermissionRequest',
    'PermissionDenied',
    'Setup',
    'TeammateIdle',
    'TaskCreated',
    'TaskCompleted',
    'Elicitation',
    'ElicitationResult',
    'ConfigChange',
    'WorktreeCreate',
    'WorktreeRemove',
    'InstructionsLoaded',
    'CwdChanged',
    'FileChanged'
] as const;

export const EXIT_REASONS = [
    'clear',
    'resume',
    'logout',
    'prompt_input_exit',
    'other',
    'bypass_permissions_disabled'
] as const;

// Type versions of const arrays for use in type positions
export type HookEvent = (typeof HOOK_EVENTS)[number];
export type ExitReason = (typeof EXIT_REASONS)[number];

// Import schema and export ModelUsage type
export { ModelUsageSchema } from './coreSchemas.js';
export type ModelUsage = {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens: number;
    cacheCreationInputTokens: number;
    webSearchRequests: number;
    costUSD: number;
    contextWindow: number;
    maxOutputTokens: number;
};

// Export SDKMessage type
export { SDKMessageSchema } from './coreSchemas.js';
export type SDKMessage = z.infer<typeof SDKMessageSchema>;

// Export SDKStatus type (status indicator for tools)
export type SDKStatus = 'off' | 'ongoing' | 'ongoing_using_fork' | 'error';
