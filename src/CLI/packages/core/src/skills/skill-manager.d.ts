/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Config } from '../config/config.js';
import type { ListSkillsOptions, SkillConfig, SkillLevel, SkillValidationResult } from './types.js';
import { SkillError } from './types.js';
/**
 * Manages skill configurations stored as directories containing SKILL.md files.
 * Provides discovery, parsing, validation, and caching for skills.
 */
export declare class SkillManager {
    private readonly config;
    private skillsCache;
    private readonly changeListeners;
    private parseErrors;
    private readonly watchers;
    private watchStarted;
    private refreshTimer;
    private readonly bundledSkillsDir;
    constructor(config: Config);
    /**
     * Adds a listener that will be called when skills change.
     * @returns A function to remove the listener.
     */
    addChangeListener(listener: () => void): () => void;
    /**
     * Notifies all registered change listeners.
     */
    private notifyChangeListeners;
    /**
     * Gets any parse errors that occurred during skill loading.
     * @returns Map of skill paths to their parse errors.
     */
    getParseErrors(): Map<string, SkillError>;
    /**
     * Lists all available skills.
     *
     * @param options - Filtering options
     * @returns Array of skill configurations
     */
    listSkills(options?: ListSkillsOptions): Promise<SkillConfig[]>;
    /**
     * Loads a skill configuration by name.
     * If level is specified, only searches that level.
     * If level is omitted, searches in precedence order: project > user > extension > bundled.
     *
     * @param name - Name of the skill to load
     * @param level - Optional level to limit search to
     * @returns SkillConfig or null if not found
     */
    loadSkill(name: string, level?: SkillLevel): Promise<SkillConfig | null>;
    /**
     * Loads a skill with its full content, ready for runtime use.
     * This includes loading additional files from the skill directory.
     *
     * @param name - Name of the skill to load
     * @param level - Optional level to limit search to
     * @returns SkillConfig or null if not found
     */
    loadSkillForRuntime(name: string, level?: SkillLevel): Promise<SkillConfig | null>;
    /**
     * Validates a skill configuration.
     *
     * @param config - Configuration to validate
     * @returns Validation result
     */
    validateConfig(config: Partial<SkillConfig>): SkillValidationResult;
    /**
     * Refreshes the skills cache by loading all skills from disk.
     */
    refreshCache(): Promise<void>;
    /**
     * Starts watching skill directories for changes.
     */
    startWatching(): Promise<void>;
    /**
     * Stops watching skill directories for changes.
     */
    stopWatching(): void;
    /**
     * Parses a SKILL.md file and returns the configuration.
     *
     * @param filePath - Path to the SKILL.md file
     * @param level - Storage level
     * @returns SkillConfig
     * @throws SkillError if parsing fails
     */
    parseSkillFile(filePath: string, level: SkillLevel): Promise<SkillConfig>;
    /**
     * Internal implementation of skill file parsing.
     */
    private parseSkillFileInternal;
    /**
     * Parses skill content from a string.
     *
     * @param content - File content
     * @param filePath - File path for error reporting
     * @param level - Storage level
     * @returns SkillConfig
     * @throws SkillError if parsing fails
     */
    parseSkillContent(content: string, filePath: string, level: SkillLevel): SkillConfig;
    /**
     * Gets the base directory for skills at a specific level.
     *
     * @param level - Storage level
     * @returns Absolute directory paths
     */
    getSkillsBaseDirs(level: SkillLevel): string[];
    /**
     * Lists skills at a specific level.
     *
     * @param level - Storage level to scan
     * @returns Array of skill configurations
     */
    private listSkillsAtLevel;
    loadSkillsFromDir(baseDir: string, level: SkillLevel): Promise<SkillConfig[]>;
    /**
     * Finds a skill by name at a specific level.
     *
     * @param name - Name of the skill to find
     * @param level - Storage level to search
     * @returns SkillConfig or null if not found
     */
    private findSkillByNameAtLevel;
    /**
     * Ensures the cache is populated for a specific level without loading other levels.
     */
    private ensureLevelCache;
    private updateWatchersFromCache;
    private scheduleRefresh;
    private ensureUserSkillsDir;
}
