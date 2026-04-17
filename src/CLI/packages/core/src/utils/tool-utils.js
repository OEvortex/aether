/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { isTool } from '../index.js';
import { ToolDisplayNames, ToolDisplayNamesMigration, ToolNames, ToolNamesMigration } from '../tools/tool-names.js';
const normalizeIdentifier = (identifier) => identifier.trim().replace(/^_+/, '');
const toolNameKeys = Object.keys(ToolNames);
const TOOL_ALIAS_MAP = (() => {
    const map = new Map();
    const addAlias = (set, alias) => {
        if (!alias) {
            return;
        }
        set.add(normalizeIdentifier(alias));
    };
    for (const key of toolNameKeys) {
        const canonicalName = ToolNames[key];
        const displayName = ToolDisplayNames[key];
        const aliases = new Set();
        addAlias(aliases, canonicalName);
        addAlias(aliases, displayName);
        addAlias(aliases, `${displayName}Tool`);
        for (const [legacyName, mappedName] of Object.entries(ToolNamesMigration)) {
            if (mappedName === canonicalName) {
                addAlias(aliases, legacyName);
            }
        }
        for (const [legacyDisplay, mappedDisplay] of Object.entries(ToolDisplayNamesMigration)) {
            if (mappedDisplay === displayName) {
                addAlias(aliases, legacyDisplay);
            }
        }
        map.set(canonicalName, aliases);
    }
    return map;
})();
const getAliasSetForTool = (toolName) => {
    const aliases = TOOL_ALIAS_MAP.get(toolName);
    if (!aliases) {
        return new Set([normalizeIdentifier(toolName)]);
    }
    return aliases;
};
const sanitizeExactIdentifier = (value) => normalizeIdentifier(value);
const sanitizePatternIdentifier = (value) => {
    const openParenIndex = value.indexOf('(');
    if (openParenIndex === -1) {
        return normalizeIdentifier(value);
    }
    return normalizeIdentifier(value.slice(0, openParenIndex));
};
const filterList = (list) => (list ?? []).filter((entry) => Boolean(entry?.trim()));
export function isToolEnabled(toolName, coreTools, excludeTools) {
    const aliasSet = getAliasSetForTool(toolName);
    const matchesIdentifier = (value) => aliasSet.has(sanitizeExactIdentifier(value));
    const matchesIdentifierWithArgs = (value) => aliasSet.has(sanitizePatternIdentifier(value));
    const filteredCore = filterList(coreTools);
    const filteredExclude = filterList(excludeTools);
    if (filteredCore.length === 0) {
        return !filteredExclude.some((entry) => matchesIdentifier(entry));
    }
    const isExplicitlyEnabled = filteredCore.some((entry) => matchesIdentifier(entry) || matchesIdentifierWithArgs(entry));
    if (!isExplicitlyEnabled) {
        return false;
    }
    return !filteredExclude.some((entry) => matchesIdentifier(entry));
}
const SHELL_TOOL_NAMES = ['run_shell_command', 'ShellTool'];
/**
 * Checks if a tool invocation matches any of a list of patterns.
 *
 * @param toolOrToolName The tool object or the name of the tool being invoked.
 * @param invocation The invocation object for the tool.
 * @param patterns A list of patterns to match against.
 *   Patterns can be:
 *   - A tool name (e.g., "ReadFileTool") to match any invocation of that tool.
 *   - A tool name with a prefix (e.g., "ShellTool(git status)") to match
 *     invocations where the arguments start with that prefix.
 * @returns True if the invocation matches any pattern, false otherwise.
 */
export function doesToolInvocationMatch(toolOrToolName, invocation, patterns) {
    let toolNames;
    if (isTool(toolOrToolName)) {
        toolNames = [toolOrToolName.name, toolOrToolName.constructor.name];
    }
    else {
        toolNames = [toolOrToolName];
    }
    if (toolNames.some((name) => SHELL_TOOL_NAMES.includes(name))) {
        toolNames = [...new Set([...toolNames, ...SHELL_TOOL_NAMES])];
    }
    for (const pattern of patterns) {
        const openParen = pattern.indexOf('(');
        if (openParen === -1) {
            // No arguments, just a tool name
            if (toolNames.includes(pattern)) {
                return true;
            }
            continue;
        }
        const patternToolName = pattern.substring(0, openParen);
        if (!toolNames.includes(patternToolName)) {
            continue;
        }
        if (!pattern.endsWith(')')) {
            continue;
        }
        const argPattern = pattern.substring(openParen + 1, pattern.length - 1);
        if ('command' in invocation.params &&
            toolNames.includes('run_shell_command')) {
            const argValue = String(invocation.params.command);
            if (argValue === argPattern ||
                argValue.startsWith(`${argPattern} `)) {
                return true;
            }
        }
    }
    return false;
}
//# sourceMappingURL=tool-utils.js.map