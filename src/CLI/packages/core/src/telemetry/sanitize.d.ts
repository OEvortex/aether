/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Sanitize hook name to remove potentially sensitive information.
 * Extracts the base command name without arguments or full paths.
 *
 * This function protects PII by removing:
 * - Full file paths that may contain usernames
 * - Command arguments that may contain credentials, API keys, tokens
 * - Environment variables with sensitive values
 *
 * Examples:
 * - "/path/to/.gemini/hooks/check-secrets.sh --api-key=abc123" -> "check-secrets.sh"
 * - "python /home/user/script.py --token=xyz" -> "python"
 * - "node index.js" -> "node"
 * - "C:\\Windows\\System32\\cmd.exe /c secret.bat" -> "cmd.exe"
 * - "" or "   " -> "unknown-command"
 *
 * @param hookName Full command string.
 * @returns Sanitized command name.
 */
export declare function sanitizeHookName(hookName: string): string;
