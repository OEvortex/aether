/*---------------------------------------------------------------------------------------------
 *  MCP Bridge Filters
 *  Handles include/exclude patterns for tools and extensions
 *--------------------------------------------------------------------------------------------*/

import type { FilterConfig } from './types';

/**
 * Check if a tool name is allowed by the filter config
 */
export function isToolAllowed(toolName: string, config: FilterConfig): boolean {
    const included = config.includeTools.some(pattern => matchesGlob(toolName, pattern));
    if (!included) return false;
    
    const excluded = config.excludeTools.some(pattern => matchesGlob(toolName, pattern));
    return !excluded;
}

/**
 * Check if an extension ID is allowed by the filter config
 */
export function isExtensionAllowed(extId: string, config: FilterConfig): boolean {
    const included = config.includeExtensions.some(pattern => matchesGlob(extId, pattern));
    if (!included) return false;
    
    const excluded = config.excludeExtensions.some(pattern => matchesGlob(extId, pattern));
    return !excluded;
}

/**
 * Simple glob pattern matcher
 * Supports: ** (any characters), * (any except /), ? (single character)
 */
function matchesGlob(str: string, pattern: string): boolean {
    const regexStr = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(str);
}
