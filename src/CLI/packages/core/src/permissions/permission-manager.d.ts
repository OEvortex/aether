/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { PermissionCheckContext, PermissionDecision, PermissionRule, PermissionRuleSet, RuleType, RuleWithSource } from './types.js';
/**
 * Minimal interface for the parts of Config used by PermissionManager.
 * Keeps the dependency explicit and avoids a circular import on the
 * full Config class.
 *
 * Each getter already returns a fully-merged list: persistent settings rules
 * plus any SDK / CLI params that have been folded in by the Config layer.
 * PermissionManager therefore only needs these three getters.
 */
export interface PermissionManagerConfig {
    /** Merged allow-rules (settings + coreTools + allowedTools). */
    getPermissionsAllow(): string[] | undefined;
    /** Merged ask-rules (settings only). */
    getPermissionsAsk(): string[] | undefined;
    /** Merged deny-rules (settings + excludeTools). */
    getPermissionsDeny(): string[] | undefined;
    /** Project root directory (for resolving path patterns). */
    getProjectRoot?(): string;
    /** Current working directory (for resolving path patterns). */
    getCwd?(): string;
    /**
     * Returns the current approval mode (plan/default/auto-edit/yolo).
     * Used by `getDefaultMode()` to determine the fallback when no rule matches.
     */
    getApprovalMode?(): string;
    /**
     * Returns the legacy coreTools allowlist.
     *
     * When non-empty, only the tools in this list will be considered enabled at
     * the registry level — all other tools will be excluded from registration.
     * This preserves the original `tools.core` whitelist semantic inside
     * PermissionManager, so `createToolRegistry` can use a single
     * `pm.isToolEnabled()` check without any legacy fallback.
     *
     * @deprecated Configure tool availability via `permissions.deny` rules
     *             (e.g. `"Bash"` to block all shell commands) instead.
     */
    getCoreTools?(): string[] | undefined;
}
/**
 * Manages tool and command permissions by evaluating a set of
 * prioritised rules against allow / ask / deny lists.
 *
 * Rule evaluation order (highest priority first):
 *   1. deny rules  → PermissionDecision.deny
 *   2. ask  rules  → PermissionDecision.ask
 *   3. allow rules → PermissionDecision.allow
 *   4. (no match)  → PermissionDecision.default
 *
 * Rules can come from three sources, checked in order within each type:
 *   - Session rules  (in-memory only, added during the current session)
 *   - Persistent rules (from settings files, passed via ConfigParameters)
 *
 * Legacy params (coreTools / allowedTools / excludeTools) are converted
 * to in-memory rules for backward compatibility with the SDK API.
 */
export declare class PermissionManager {
    private readonly config;
    /** Persistent rules loaded from settings (all scopes merged). */
    private persistentRules;
    /** In-memory rules added for the current session only. */
    private sessionRules;
    /**
     * Canonical tool names from the legacy `coreTools` allowlist.
     * When non-null, `isToolEnabled()` rejects any tool not in this set.
     * Populated during `initialize()` from `config.getCoreTools()`.
     */
    private coreToolsAllowList;
    constructor(config: PermissionManagerConfig);
    /**
     * Initialise from the config's permission parameters.
     * Must be called once before any rule lookups.
     *
     * The config getters already return fully-merged lists (settings + SDK params),
     * so we simply parse them into typed rules.
     */
    initialize(): void;
    /**
     * Evaluate the permission decision for a given tool invocation context.
     *
     * @param ctx - The context containing the tool name and optional command.
     * @returns A PermissionDecision indicating how to handle this tool call.
     */
    evaluate(ctx: PermissionCheckContext): Promise<PermissionDecision>;
    /**
     * Evaluate a single (non-compound) context against all rules.
     *
     * For shell commands (run_shell_command), the result is the most restrictive
     * of:
     *   1. The base decision from Bash / command-pattern rules.
     *   2. The decision derived from virtual file / network operations extracted
     *      via `extractShellOperations` — allows Read/Edit/Write/WebFetch rules
     *      to match equivalent shell commands (e.g. `cat` → Read, `curl` → WebFetch).
     */
    private evaluateSingle;
    /**
     * Evaluate a list of virtual operations (derived from shell command analysis)
     * against all current rules.  Returns the most restrictive matching decision,
     * or `'default'` if no rule matches any operation.
     *
     * Each operation is evaluated as if it were a direct invocation of its
     * `virtualTool` (e.g. `read_file`, `web_fetch`, `edit`), so Read/Edit/etc.
     * rules are applied naturally.
     */
    private evaluateShellVirtualOps;
    /**
     * Evaluate a compound command by splitting it into sub-commands,
     * evaluating each independently, and returning the most restrictive result.
     *
     * Restriction order: deny > ask > allow
     *
     * When a sub-command returns 'default' (no rule matches), it is resolved to
     * the actual default permission using AST analysis:
     *   - Command substitution detected → 'deny'
     *   - Read-only command (cd, ls, git status, etc.) → 'allow'
     *   - Otherwise → 'ask'
     *
     * Example: with rules `allow: [git checkout *]`
     *   - "cd /path && git checkout -b feature" → allow (cd) + allow (rule) → allow
     *   - "rm /path && git checkout -b feature" → ask (rm) + allow (rule) → ask
     *   - "evil-cmd && git checkout" (deny: [evil-cmd]) → deny + allow → deny
     */
    private evaluateCompoundCommand;
    /**
     * Resolve 'default' permission to actual permission using AST analysis.
     * This mirrors the logic in ShellToolInvocation.getDefaultPermission().
     *
     * @param command - The shell command to analyze.
     * @returns 'deny' for command substitution, 'allow' for read-only, 'ask' otherwise.
     */
    private resolveDefaultPermission;
    /**
     * Core tools that are subject to the coreTools allowlist check.
     * Tools not in this set (MCP, Skill, Agent, etc.) bypass the check.
     */
    private static readonly CORE_TOOLS;
    /**
     * Check if a tool is a core tool subject to the coreTools allowlist check.
     */
    private isCoreTool;
    /**
     * Determine whether a tool should be present in the tool registry.
     *
     * A tool is disabled (returns false) when a `deny` rule without a specifier
     * (i.e. a whole-tool deny) matches.  Specifier-based deny rules such as
     * `"Bash(rm -rf *)"` do NOT remove the tool from the registry – they only
     * deny specific invocations at runtime.
     *
     * Non-core tools (MCP, Skill, Agent, etc.) skip the coreTools allowlist
     * check because they are dynamically discovered or essential for system
     * operation.
     */
    isToolEnabled(toolName: string): Promise<boolean>;
    /**
     * Find the first deny rule that matches the given context.
     * Returns the raw rule string if found, or undefined if no deny rule matches.
     *
     * Useful for providing user-visible feedback about which rule caused a denial.
     */
    findMatchingDenyRule(ctx: PermissionCheckContext): string | undefined;
    /**
     * Determine the permission decision for a specific shell command string.
     *
     * @param command - The shell command to evaluate.
     * @returns The PermissionDecision for this command.
     */
    isCommandAllowed(command: string): Promise<PermissionDecision>;
    /**
     * Check whether any rule (allow, ask, or deny) in the current rule set
     * matches the given invocation context.
     *
     * This allows the scheduler to skip the full `evaluate()` call when no
     * rules are relevant, preserving the tool's `getDefaultPermission()` result
     * as-is.
     *
     * "Relevant" means at least one rule's toolName matches AND, if the rule
     * has a specifier, it also matches the context's command/filePath/domain.
     *
     * Examples for Shell executing `git clone xxx`:
     *   - "Bash"               → matches (tool-level rule, no specifier)
     *   - "Bash(git *)"        → matches (git sub-command wildcard)
     *   - "Bash(git clone *)"  → matches (exact sub-command wildcard)
     *   - "Bash(git add *)"    → no match (different sub-command)
     *   - "Edit"               → no match (different tool)
     *
     * @param ctx - Permission check context.
     * @returns true if at least one rule matches.
     */
    hasRelevantRules(ctx: PermissionCheckContext): boolean;
    /**
     * Returns true when the invocation is matched by an explicit `ask` rule.
     *
     * This is intentionally narrower than `evaluate(ctx) === 'ask'`. Shell
     * commands can resolve to `ask` simply because they are non-read-only and no
     * explicit allow/deny rule matched. That fallback should still allow users to
     * create new allow rules, so callers must only hide "Always allow" when a
     * real ask rule matched.
     */
    hasMatchingAskRule(ctx: PermissionCheckContext): boolean;
    /**
     * Add a session-level allow rule (in-memory, cleared when the session ends).
     * Used when the user clicks "Always allow for this session".
     *
     * @param raw - The raw rule string, e.g. "Bash(git status)".
     */
    addSessionAllowRule(raw: string): void;
    /**
     * Add a session-level deny rule (in-memory, cleared when the session ends).
     */
    addSessionDenyRule(raw: string): void;
    /**
     * Add a session-level ask rule (in-memory, cleared when the session ends).
     */
    addSessionAskRule(raw: string): void;
    /**
     * Add a single persistent rule to the specified type.
     * This modifies the in-memory rule set; the caller is responsible for
     * persisting the change to disk (e.g. by writing to settings.json).
     *
     * @param raw - The raw rule string, e.g. "Bash(git *)"
     * @param type - 'allow' | 'ask' | 'deny'
     * @returns The parsed rule that was added.
     */
    addPersistentRule(raw: string, type: RuleType): PermissionRule;
    /**
     * Remove a persistent rule matching the given raw string from the
     * specified type.  Removes the first match only.
     *
     * @returns true if a rule was removed, false if no matching rule was found.
     */
    removePersistentRule(raw: string, type: RuleType): boolean;
    /**
     * Return the current default approval mode from config.
     * This is used by the UI layer when `evaluate()` returns 'default' to
     * determine the actual behavior (ask vs allow).
     */
    getDefaultMode(): string;
    /**
     * Update the persistent deny rules (called after migrating settings).
     * Replaces the persistent deny rule set entirely.
     */
    updatePersistentRules(ruleSet: Partial<PermissionRuleSet>): void;
    /**
     * Return all active rules with their types and scopes, suitable for
     * display in the /permissions dialog.
     */
    listRules(): RuleWithSource[];
    /**
     * Return a summary of active allow rules (raw strings), including
     * both session and persistent rules.  Used for telemetry.
     */
    getAllowRawStrings(): string[];
}
