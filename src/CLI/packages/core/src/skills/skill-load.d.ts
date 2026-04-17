import type { SkillConfig, SkillValidationResult } from './types.js';
export declare function loadSkillsFromDir(baseDir: string): Promise<SkillConfig[]>;
export declare function parseSkillContent(content: string, filePath: string): SkillConfig;
export declare function validateConfig(config: Partial<SkillConfig>): SkillValidationResult;
