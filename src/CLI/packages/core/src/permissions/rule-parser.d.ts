/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import type { PermissionCheckContext, PermissionRule, SpecifierKind } from './types.js';
/**
 * Map of known tool name aliases to their canonical names.
 * Covers all built-in tools plus common aliases (including Claude Code's "Bash").
 */
export declare const TOOL_NAME_ALIASES: Readonly<Record<string, string>>;
/**
 * Resolve a raw tool name or alias to its canonical name.
 * Returns the input unchanged if it is not in the alias map
 * (e.g. MCP tool names are kept as-is).
 */
export declare function resolveToolName(rawName: string): string;
/**
 * Determine the specifier kind for a given canonical tool name.
 * This tells the matching engine which algorithm to use for the specifier.
 */
export declare function getSpecifierKind(canonicalToolName: string): SpecifierKind;
/**
 * Check whether a given tool (by canonical name) is covered by a rule's tool name,
 * taking meta-categories into account.
 *
 * "Read" → resolves to "read_file", but also covers grep_search, glob, list_directory
 * "Edit" → resolves to "edit", but also covers write_file
 */
export declare function toolMatchesRuleToolName(ruleToolName: string, contextToolName: string): boolean;
/**
 * Parse a raw permission rule string into a PermissionRule object.
 *
 * Supported formats:
 *   "ToolName"            → matches all invocations of the tool
 *   "ToolName(specifier)" → fine-grained matching via specifier
 *
 * Tool-specific specifier semantics:
 *   "Bash(git *)"               → shell command glob
 *   "Read(./secrets/**)"        → gitignore-style path match
 *   "Edit(/src/**\/*.ts)"        → gitignore-style path match
 *   "WebFetch(domain:x.com)"    → domain match
 *   "Agent(Explore)"            → subagent type literal match (alias for Task)
 *   "mcp__server__tool"         → MCP tool (no specifier needed)
 */
export declare function parseRule(raw: string): PermissionRule;
/**
 * Parse an array of raw rule strings into PermissionRule objects,
 * silently skipping any empty entries.
 */
export declare function parseRules(raws: string[]): PermissionRule[];
/**
 * Get the human-friendly display name to use in a permission rule string
 * for a given canonical tool name.
 *
 * Falls back to the canonical name itself for unknown tools (e.g. MCP tools).
 */
export declare function getRuleDisplayName(canonicalToolName: string): string;
/**
 * Build minimum-scope permission rule strings from a permission check context.
 *
 * This is the **single, centralised** function for generating rules to be
 * persisted when a user selects "Always Allow".  Rules follow the format
 * `DisplayName(specifier)` where the specifier narrows the rule to the
 * minimum scope required by the current invocation.
 *
 * Specifier selection by tool category:
 *   - **path** tools (Read/Edit):
 *       File-targeted tools (read_file, edit, write_file) use the **parent
 *       directory** so the rule covers the whole directory, not a single file.
 *       Directory-targeted tools (grep, glob, ls) use the directory as-is.
 *       The `//` prefix denotes an absolute filesystem path in the rule grammar.
 *   - **domain** tools (WebFetch): `WebFetch(example.com)`
 *   - **command** tools (Bash): `Bash(command)` — note: Shell already generates
 *     its own fine-grained rules via `extractCommandRules`; this is a fallback.
 *   - **literal** tools (Skill/Task): `Skill(name)` / `Task(type)`
 *
 * If no specifier is available the rule falls back to the bare display name
 * (e.g. `Read`), which matches **all** invocations of that tool category.
 *
 * @param ctx - The permission check context (built in coreToolScheduler L4).
 * @returns Array of rule strings (usually a single element).
 */
export declare function buildPermissionRules(ctx: PermissionCheckContext): string[];
/**
 * Build a human-readable label describing what a set of permission rules allow.
 *
 * Used in "Always Allow" UI options to give users a clear, natural-language
 * description instead of raw rule syntax.
 *
 * Examples:
 *   `["Read(//Users/mochi/.aether/**)"]`  → `"read files in /Users/mochi/.aether/"`
 *   `["Bash(git *)"]`                    → `"run 'git *' commands"`
 *   `["WebFetch(github.com)"]`            → `"fetch from github.com"`
 *   `["Read"]`                            → `"read files"`
 *
 * @param rules - Array of rule strings from buildPermissionRules()
 * @returns A human-readable description string
 */
export declare function buildHumanReadableRuleLabel(rules: string[]): string;
/**
 * Split a compound shell command into its individual simple commands
 * by splitting on unquoted shell operators (&&, ||, ;, |, etc.).
 *
 * Returns an array of trimmed simple command strings.
 * For simple commands (no operators), returns a single-element array.
 *
 * Examples:
 *   "git status && rm -rf /"  → ["git status", "rm -rf /"]
 *   "ls -la | grep foo"      → ["ls -la", "grep foo"]
 *   "echo 'a && b'"          → ["echo 'a && b'"]  (inside quotes)
 *   "a && b || c"            → ["a", "b", "c"]
 */
export declare function splitCompoundCommand(command: string): string[];
/**
 * Match a shell command against a glob pattern.
 *
 * Key semantics (from Claude Code docs):
 *
 * 1. `*` wildcard can appear at any position (head, middle, tail).
 *
 * 2. **Word boundary rule**: A space before `*` enforces a word boundary.
 *    - `Bash(ls *)` matches `ls -la` but NOT `lsof`
 *    - `Bash(ls*)` matches both `ls -la` and `lsof`
 *
 * 3. **Shell operator awareness**: Patterns don't match across operator
 *    boundaries. We extract only the first simple command before matching.
 *
 * 4. Without `*`, uses prefix matching for backward compatibility.
 *    `Bash(git commit)` matches `git commit -m "test"`.
 *
 * 5. `Bash(*)` is equivalent to `Bash` and matches any command.
 */
export declare function matchesCommandPattern(pattern: string, command: string): boolean;
/**
 * Resolve a path pattern from a permission rule specifier to an absolute
 * glob pattern for matching.
 *
 * Path pattern prefixes (from Claude Code docs):
 *
 * | Prefix    | Meaning                           | Example                      |
 * |-----------|-----------------------------------|------------------------------|
 * | `//path`  | Absolute from filesystem root      | `//Users/alice/secrets/**`   |
 * | `~/path`  | Relative to home directory         | `~/Documents/*.pdf`          |
 * | `/path`   | Relative to project root           | `/src/**\/*.ts`               |
 * | `./path`  | Relative to current working dir    | `./secrets/**`               |
 * | `path`    | Relative to current working dir    | `*.env`                      |
 *
 * WARNING: `/Users/alice/file` is NOT an absolute path — it's relative to
 * the project root. Use `//Users/alice/file` for absolute paths.
 */
export declare function resolvePathPattern(specifier: string, projectRoot: string, cwd: string): string;
/**
 * Match a file path against a gitignore-style path pattern.
 *
 * Uses picomatch for the actual glob matching, following gitignore semantics:
 *   - `*` matches files in a single directory (does not cross `/`)
 *   - `**` matches recursively across directories
 *
 * @param specifier - The raw specifier from the rule (e.g. "./secrets/**")
 * @param filePath - The absolute path of the file being accessed
 * @param projectRoot - The project root directory (absolute)
 * @param cwd - The current working directory (absolute)
 * @returns True if the file path matches the pattern
 */
export declare function matchesPathPattern(specifier: string, filePath: string, projectRoot: string, cwd: string): boolean;
/**
 * Match a domain against a WebFetch domain specifier.
 *
 * Specifier format: `domain:example.com`
 * Matches the exact domain or any subdomain.
 *
 * Examples:
 *   matchesDomainPattern("domain:example.com", "example.com")      → true
 *   matchesDomainPattern("domain:example.com", "sub.example.com")  → true
 *   matchesDomainPattern("domain:example.com", "notexample.com")   → false
 */
export declare function matchesDomainPattern(specifier: string, domain: string): boolean;
/**
 * Options for path-based matching, providing the directory context needed
 * to resolve relative path patterns.
 */
export interface PathMatchContext {
    /** The project root directory (absolute path). */
    projectRoot: string;
    /** The current working directory (absolute path). */
    cwd: string;
}
/**
 * Check whether a parsed PermissionRule matches a given context.
 *
 * Matching logic depends on the tool and specifier type:
 *
 * 1. **Tool name matching**:
 *    - "Read" rules also match grep_search, glob, list_directory (meta-category).
 *    - "Edit" rules also match write_file (meta-category).
 *    - MCP tools support wildcard patterns (e.g. "mcp__server__*").
 *
 * 2. **No specifier**: matches any invocation of the tool.
 *
 * 3. **With specifier** (depends on specifierKind):
 *    - `command`: Shell glob matching with word boundary & operator awareness
 *    - `path`: Gitignore-style file path matching (*, **)
 *    - `domain`: Domain matching for WebFetch
 *    - `literal`: Exact string match (for Agent subagent names, etc.)
 *
 * @param rule - The parsed permission rule
 * @param toolName - The canonical tool name being checked
 * @param command - Shell command (for Bash rules)
 * @param filePath - Absolute file path (for Read/Edit rules)
 * @param domain - Domain (for WebFetch rules)
 * @param pathContext - Project root and cwd for resolving relative path patterns
 */
export declare function matchesRule(rule: PermissionRule, toolName: string, command?: string, filePath?: string, domain?: string, pathContext?: PathMatchContext, specifier?: string): boolean;
