/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
import path from 'node:path';
import { logSkillLaunch, SkillLaunchEvent } from '../telemetry/index.js';
import { createDebugLogger } from '../utils/debugLogger.js';
import { ToolDisplayNames, ToolNames } from './tool-names.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
const debugLogger = createDebugLogger('SKILL');
/**
 * Builds the LLM-facing content string when a skill body is injected.
 * Shared between SkillToolInvocation (runtime) and /context (estimation)
 * so that token estimates stay in sync with actual usage.
 */
export function buildSkillLlmContent(baseDir, body) {
    return `Base directory for this skill: ${baseDir}\nImportant: ALWAYS resolve absolute paths from this base directory when working with skills.\n\n${body}\n`;
}
/**
 * Skill tool that enables the model to access skill definitions.
 * The tool dynamically loads available skills and includes them in its description
 * for the model to choose from.
 */
export class SkillTool extends BaseDeclarativeTool {
    config;
    static Name = ToolNames.SKILL;
    skillManager;
    availableSkills = [];
    loadedSkillNames = new Set();
    constructor(config) {
        // Initialize with a basic schema first
        const initialSchema = {
            type: 'object',
            properties: {
                skill: {
                    type: 'string',
                    description: 'The skill name (no arguments). E.g., "pdf" or "xlsx"'
                }
            },
            required: ['skill'],
            additionalProperties: false,
            $schema: 'http://json-schema.org/draft-07/schema#'
        };
        super(SkillTool.Name, ToolDisplayNames.SKILL, 'Execute a skill within the main conversation. Loading available skills...', // Initial description
        Kind.Read, initialSchema, false, // isOutputMarkdown
        false // canUpdateOutput
        );
        this.config = config;
        const skillManager = config.getSkillManager();
        if (!skillManager) {
            throw new Error('SkillManager not available');
        }
        this.skillManager = skillManager;
        this.skillManager.addChangeListener(() => {
            void this.refreshSkills();
        });
        // Initialize the tool asynchronously
        this.refreshSkills();
    }
    /**
     * Asynchronously initializes the tool by loading available skills
     * and updating the description and schema.
     */
    async refreshSkills() {
        try {
            this.availableSkills = await this.skillManager.listSkills();
            this.updateDescriptionAndSchema();
        }
        catch (error) {
            debugLogger.warn('Failed to load skills for Skills tool:', error);
            this.availableSkills = [];
            this.updateDescriptionAndSchema();
        }
        finally {
            // Update the client with the new tools
            const geminiClient = this.config.getGeminiClient();
            if (geminiClient) {
                await geminiClient.setTools();
            }
        }
    }
    /**
     * Updates the tool's description and schema based on available skills.
     */
    updateDescriptionAndSchema() {
        let skillDescriptions = '';
        if (this.availableSkills.length === 0) {
            skillDescriptions =
                'No skills are currently configured. Skills can be created by adding directories with SKILL.md files to .aether/skills/ or ~/.aether/skills/.';
        }
        else {
            skillDescriptions = this.availableSkills
                .map((skill) => `<skill>
<name>
${skill.name}
</name>
<description>
${skill.description} (${skill.level})
</description>
<location>
${skill.level}
</location>
</skill>`)
                .join('\n');
        }
        const baseDescription = `Execute a skill within the main conversation

<skills_instructions>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to invoke:
- Use this tool with the skill name only (no arguments)
- Examples:
  - \`skill: "pdf"\` - invoke the pdf skill
  - \`skill: "xlsx"\` - invoke the xlsx skill
  - \`skill: "ms-office-suite:pdf"\` - invoke using fully qualified name

Important:
- When a skill is relevant, you must invoke this tool IMMEDIATELY as your first action
- NEVER just announce or mention a skill in your text response without actually calling this tool
- This is a BLOCKING REQUIREMENT: invoke the relevant Skill tool BEFORE generating any other response about the task
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already running
- Do not use this tool for built-in CLI commands (like /help, /clear, etc.)
- When executing scripts or loading referenced files, ALWAYS resolve absolute paths from skill's base directory. Examples:
  - \`bash scripts/init.sh\` -> \`bash /path/to/skill/scripts/init.sh\`
  - \`python scripts/helper.py\` -> \`python /path/to/skill/scripts/helper.py\`
  - \`reference.md\` -> \`/path/to/skill/reference.md\`
</skills_instructions>

<available_skills>
${skillDescriptions}
</available_skills>
`;
        // Update description using object property assignment
        this.description = baseDescription;
    }
    validateToolParams(params) {
        // Validate required fields
        if (!params.skill ||
            typeof params.skill !== 'string' ||
            params.skill.trim() === '') {
            return 'Parameter "skill" must be a non-empty string.';
        }
        // Validate that the skill exists
        const skillExists = this.availableSkills.some((skill) => skill.name === params.skill);
        if (!skillExists) {
            const availableNames = this.availableSkills.map((s) => s.name);
            if (availableNames.length === 0) {
                return `Skill "${params.skill}" not found. No skills are currently available.`;
            }
            return `Skill "${params.skill}" not found. Available skills: ${availableNames.join(', ')}`;
        }
        return null;
    }
    createInvocation(params) {
        return new SkillToolInvocation(this.config, this.skillManager, params, (name) => this.loadedSkillNames.add(name));
    }
    getAvailableSkillNames() {
        return this.availableSkills.map((skill) => skill.name);
    }
    /**
     * Returns the set of skill names that have been successfully loaded
     * (invoked) during the current session. Used by /context to attribute
     * loaded skill body tokens separately from the tool-definition cost.
     */
    getLoadedSkillNames() {
        return this.loadedSkillNames;
    }
    /**
     * Clears the loaded-skills tracking. Should be called when the session
     * is reset (e.g. /clear) so that stale body-token data is not shown.
     */
    clearLoadedSkills() {
        this.loadedSkillNames.clear();
    }
}
class SkillToolInvocation extends BaseToolInvocation {
    config;
    skillManager;
    onSkillLoaded;
    constructor(config, skillManager, params, onSkillLoaded) {
        super(params);
        this.config = config;
        this.skillManager = skillManager;
        this.onSkillLoaded = onSkillLoaded;
    }
    getDescription() {
        return `Use skill: "${this.params.skill}"`;
    }
    async execute(_signal, _updateOutput) {
        try {
            // Load the skill with runtime config (includes additional files)
            const skill = await this.skillManager.loadSkillForRuntime(this.params.skill);
            if (!skill) {
                // Log failed skill launch
                logSkillLaunch(this.config, new SkillLaunchEvent(this.params.skill, false));
                // Get parse errors if any
                const parseErrors = this.skillManager.getParseErrors();
                const errorMessages = [];
                for (const [filePath, error] of parseErrors) {
                    if (filePath.includes(this.params.skill)) {
                        errorMessages.push(`Parse error at ${filePath}: ${error.message}`);
                    }
                }
                const errorDetail = errorMessages.length > 0
                    ? `\nErrors:\n${errorMessages.join('\n')}`
                    : '';
                return {
                    llmContent: `Skill "${this.params.skill}" not found.${errorDetail}`,
                    returnDisplay: `Skill "${this.params.skill}" not found.${errorDetail}`
                };
            }
            // Log successful skill launch
            logSkillLaunch(this.config, new SkillLaunchEvent(this.params.skill, true));
            this.onSkillLoaded(this.params.skill);
            const baseDir = path.dirname(skill.filePath);
            const llmContent = buildSkillLlmContent(baseDir, skill.body);
            return {
                llmContent: [{ text: llmContent }],
                returnDisplay: skill.description
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            debugLogger.error(`[SkillsTool] Error using skill: ${errorMessage}`);
            // Log failed skill launch
            logSkillLaunch(this.config, new SkillLaunchEvent(this.params.skill, false));
            return {
                llmContent: `Failed to load skill "${this.params.skill}": ${errorMessage}`,
                returnDisplay: `Failed to load skill "${this.params.skill}": ${errorMessage}`
            };
        }
    }
}
//# sourceMappingURL=skill.js.map