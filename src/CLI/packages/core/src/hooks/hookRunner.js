/**
 * @license
 * Copyright 2026 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import { spawn } from 'node:child_process';
import { createDebugLogger } from '../utils/debugLogger.js';
import { escapeShellArg, getShellConfiguration } from '../utils/shell-utils.js';
import { HookEventName } from './types.js';
const debugLogger = createDebugLogger('TRUSTED_HOOKS');
/**
 * Default timeout for hook execution (60 seconds)
 */
const DEFAULT_HOOK_TIMEOUT = 60000;
/**
 * Maximum length for stdout/stderr output (1MB)
 * Prevents memory issues from unbounded output
 */
const MAX_OUTPUT_LENGTH = 1024 * 1024;
/**
 * Exit code constants for hook execution
 */
const EXIT_CODE_SUCCESS = 0;
const EXIT_CODE_NON_BLOCKING_ERROR = 1;
/**
 * Hook runner that executes command hooks
 */
export class HookRunner {
    /**
     * Execute a single hook
     * @param hookConfig Hook configuration
     * @param eventName Event name
     * @param input Hook input
     * @param signal Optional AbortSignal to cancel hook execution
     */
    async executeHook(hookConfig, eventName, input, signal) {
        const startTime = Date.now();
        // Check if already aborted before starting
        if (signal?.aborted) {
            const hookId = hookConfig.name || hookConfig.command || 'unknown';
            return {
                hookConfig,
                eventName,
                success: false,
                error: new Error(`Hook execution cancelled (aborted): ${hookId}`),
                duration: 0
            };
        }
        try {
            return await this.executeCommandHook(hookConfig, eventName, input, startTime, signal);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const hookId = hookConfig.name || hookConfig.command || 'unknown';
            const errorMessage = `Hook execution failed for event '${eventName}' (hook: ${hookId}): ${error}`;
            debugLogger.warn(`Hook execution error (non-fatal): ${errorMessage}`);
            return {
                hookConfig,
                eventName,
                success: false,
                error: error instanceof Error ? error : new Error(errorMessage),
                duration
            };
        }
    }
    /**
     * Execute multiple hooks in parallel
     * @param signal Optional AbortSignal to cancel hook execution
     */
    async executeHooksParallel(hookConfigs, eventName, input, onHookStart, onHookEnd, signal) {
        const promises = hookConfigs.map(async (config, index) => {
            onHookStart?.(config, index);
            const result = await this.executeHook(config, eventName, input, signal);
            onHookEnd?.(config, result);
            return result;
        });
        return Promise.all(promises);
    }
    /**
     * Execute multiple hooks sequentially
     * @param signal Optional AbortSignal to cancel hook execution
     */
    async executeHooksSequential(hookConfigs, eventName, input, onHookStart, onHookEnd, signal) {
        const results = [];
        let currentInput = input;
        for (let i = 0; i < hookConfigs.length; i++) {
            // Check if aborted before each hook
            if (signal?.aborted) {
                break;
            }
            const config = hookConfigs[i];
            onHookStart?.(config, i);
            const result = await this.executeHook(config, eventName, currentInput, signal);
            onHookEnd?.(config, result);
            results.push(result);
            // If the hook succeeded and has output, use it to modify the input for the next hook
            if (result.success && result.output) {
                currentInput = this.applyHookOutputToInput(currentInput, result.output, eventName);
            }
        }
        return results;
    }
    /**
     * Apply hook output to modify input for the next hook in sequential execution
     */
    applyHookOutputToInput(originalInput, hookOutput, eventName) {
        // Create a copy of the original input
        const modifiedInput = { ...originalInput };
        // Apply modifications based on hook output and event type
        if (hookOutput.hookSpecificOutput) {
            switch (eventName) {
                case HookEventName.UserPromptSubmit:
                    if ('additionalContext' in hookOutput.hookSpecificOutput) {
                        // For UserPromptSubmit, we could modify the prompt with additional context
                        const additionalContext = hookOutput.hookSpecificOutput.additionalContext;
                        if (typeof additionalContext === 'string' &&
                            'prompt' in modifiedInput) {
                            modifiedInput.prompt +=
                                `\n\n${additionalContext}`;
                        }
                    }
                    break;
                case HookEventName.PreToolUse:
                    if ('tool_input' in hookOutput.hookSpecificOutput) {
                        const newToolInput = hookOutput.hookSpecificOutput
                            .tool_input;
                        if (newToolInput && 'tool_input' in modifiedInput) {
                            modifiedInput.tool_input = {
                                ...modifiedInput
                                    .tool_input,
                                ...newToolInput
                            };
                        }
                    }
                    break;
                default:
                    // For other events, no special input modification is needed
                    break;
            }
        }
        return modifiedInput;
    }
    /**
     * Execute a command hook
     * @param hookConfig Hook configuration
     * @param eventName Event name
     * @param input Hook input
     * @param startTime Start time for duration calculation
     * @param signal Optional AbortSignal to cancel hook execution
     */
    async executeCommandHook(hookConfig, eventName, input, startTime, signal) {
        const timeout = hookConfig.timeout ?? DEFAULT_HOOK_TIMEOUT;
        return new Promise((resolve) => {
            if (!hookConfig.command) {
                const errorMessage = 'Command hook missing command';
                debugLogger.warn(`Hook configuration error (non-fatal): ${errorMessage}`);
                resolve({
                    hookConfig,
                    eventName,
                    success: false,
                    error: new Error(errorMessage),
                    duration: Date.now() - startTime
                });
                return;
            }
            let stdout = '';
            let stderr = '';
            let timedOut = false;
            let aborted = false;
            const shellConfig = getShellConfiguration();
            const command = this.expandCommand(hookConfig.command, input, shellConfig.shell);
            const env = {
                ...process.env,
                GEMINI_PROJECT_DIR: input.cwd,
                CLAUDE_PROJECT_DIR: input.cwd, // For compatibility
                AETHER_PROJECT_DIR: input.cwd, // For Qwen Code compatibility
                ...hookConfig.env
            };
            const child = spawn(shellConfig.executable, [...shellConfig.argsPrefix, command], {
                env,
                cwd: input.cwd,
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: false
            });
            // Helper to kill child process
            const killChild = () => {
                if (!child.killed) {
                    child.kill('SIGTERM');
                    // Force kill after 2 seconds
                    setTimeout(() => {
                        if (!child.killed) {
                            child.kill('SIGKILL');
                        }
                    }, 2000);
                }
            };
            // Set up timeout
            const timeoutHandle = setTimeout(() => {
                timedOut = true;
                killChild();
            }, timeout);
            // Set up abort handler
            const abortHandler = () => {
                aborted = true;
                clearTimeout(timeoutHandle);
                killChild();
            };
            if (signal) {
                signal.addEventListener('abort', abortHandler);
            }
            // Send input to stdin
            if (child.stdin) {
                child.stdin.on('error', (err) => {
                    // Ignore EPIPE errors which happen when the child process closes stdin early
                    if (err.code !== 'EPIPE') {
                        debugLogger.debug(`Hook stdin error: ${err}`);
                    }
                });
                // Wrap write operations in try-catch to handle synchronous EPIPE errors
                // that occur when the child process exits before we finish writing
                try {
                    child.stdin.write(JSON.stringify(input));
                    child.stdin.end();
                }
                catch (err) {
                    // Ignore EPIPE errors which happen when the child process closes stdin early
                    if (err instanceof Error &&
                        'code' in err &&
                        err.code !== 'EPIPE') {
                        debugLogger.debug(`Hook stdin write error: ${err}`);
                    }
                }
            }
            // Collect stdout
            child.stdout?.on('data', (data) => {
                if (stdout.length < MAX_OUTPUT_LENGTH) {
                    const remaining = MAX_OUTPUT_LENGTH - stdout.length;
                    stdout += data.slice(0, remaining).toString();
                    if (data.length > remaining) {
                        debugLogger.warn(`Hook stdout exceeded max length (${MAX_OUTPUT_LENGTH} bytes), truncating`);
                    }
                }
            });
            // Collect stderr
            child.stderr?.on('data', (data) => {
                if (stderr.length < MAX_OUTPUT_LENGTH) {
                    const remaining = MAX_OUTPUT_LENGTH - stderr.length;
                    stderr += data.slice(0, remaining).toString();
                    if (data.length > remaining) {
                        debugLogger.warn(`Hook stderr exceeded max length (${MAX_OUTPUT_LENGTH} bytes), truncating`);
                    }
                }
            });
            // Handle process exit
            child.on('close', (exitCode) => {
                clearTimeout(timeoutHandle);
                // Clean up abort listener
                if (signal) {
                    signal.removeEventListener('abort', abortHandler);
                }
                const duration = Date.now() - startTime;
                if (aborted) {
                    resolve({
                        hookConfig,
                        eventName,
                        success: false,
                        error: new Error('Hook execution cancelled (aborted)'),
                        stdout,
                        stderr,
                        duration
                    });
                    return;
                }
                if (timedOut) {
                    resolve({
                        hookConfig,
                        eventName,
                        success: false,
                        error: new Error(`Hook timed out after ${timeout}ms`),
                        stdout,
                        stderr,
                        duration
                    });
                    return;
                }
                // Parse output
                // Exit code 2 is a blocking error - ignore stdout, use stderr only
                let output;
                const isBlockingError = exitCode === 2;
                // For exit code 2, only use stderr (ignore stdout)
                const textToParse = isBlockingError
                    ? stderr.trim()
                    : stdout.trim() || stderr.trim();
                if (textToParse) {
                    // Try parsing as JSON to preserve structured output like
                    // hookSpecificOutput.additionalContext (applies to both exit 0 and exit 2)
                    try {
                        let parsed = JSON.parse(textToParse);
                        if (typeof parsed === 'string') {
                            parsed = JSON.parse(parsed);
                        }
                        if (parsed && typeof parsed === 'object') {
                            output = parsed;
                        }
                    }
                    catch {
                        // Not JSON, convert plain text to structured output
                        output = this.convertPlainTextToHookOutput(textToParse, isBlockingError
                            ? exitCode
                            : exitCode || EXIT_CODE_SUCCESS);
                    }
                }
                resolve({
                    hookConfig,
                    eventName,
                    success: exitCode === EXIT_CODE_SUCCESS,
                    output,
                    stdout,
                    stderr,
                    exitCode: exitCode || EXIT_CODE_SUCCESS,
                    duration
                });
            });
            // Handle process errors
            child.on('error', (error) => {
                clearTimeout(timeoutHandle);
                // Clean up abort listener
                if (signal) {
                    signal.removeEventListener('abort', abortHandler);
                }
                const duration = Date.now() - startTime;
                resolve({
                    hookConfig,
                    eventName,
                    success: false,
                    error,
                    stdout,
                    stderr,
                    duration
                });
            });
        });
    }
    /**
     * Expand command with environment variables and input context
     */
    expandCommand(command, input, shellType) {
        debugLogger.debug(`Expanding hook command: ${command} (cwd: ${input.cwd})`);
        const escapedCwd = escapeShellArg(input.cwd, shellType);
        return command
            .replace(/\$GEMINI_PROJECT_DIR/g, () => escapedCwd)
            .replace(/\$CLAUDE_PROJECT_DIR/g, () => escapedCwd); // For compatibility
    }
    /**
     * Convert plain text output to structured HookOutput
     */
    convertPlainTextToHookOutput(text, exitCode) {
        if (exitCode === EXIT_CODE_SUCCESS) {
            // Success - treat as system message or additional context
            return {
                decision: 'allow',
                reason: 'Hook executed successfully',
                systemMessage: text
            };
        }
        else if (exitCode === EXIT_CODE_NON_BLOCKING_ERROR) {
            // Non-blocking error (EXIT_CODE_NON_BLOCKING_ERROR = 1)
            return {
                decision: 'allow',
                reason: `Non-blocking error: ${text}`,
                systemMessage: `Warning: ${text}`
            };
        }
        else {
            // All other non-zero exit codes (including 2) are blocking
            return {
                decision: 'deny',
                reason: text
            };
        }
    }
}
//# sourceMappingURL=hookRunner.js.map