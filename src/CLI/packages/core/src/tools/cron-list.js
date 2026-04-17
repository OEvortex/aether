/**
 * cron_list tool — lists all active in-session cron jobs.
 */
import { humanReadableCron } from '../utils/cronDisplay.js';
import { ToolDisplayNames, ToolNames } from './tool-names.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
class CronListInvocation extends BaseToolInvocation {
    config;
    constructor(config, params) {
        super(params);
        this.config = config;
    }
    getDescription() {
        return '';
    }
    async execute() {
        const scheduler = this.config.getCronScheduler();
        const jobs = scheduler.list();
        if (jobs.length === 0) {
            const result = 'No active cron jobs.';
            return { llmContent: result, returnDisplay: result };
        }
        const llmLines = jobs.map((job) => {
            const type = job.recurring ? 'recurring' : 'one-shot';
            return `${job.id} — ${job.cronExpr} (${type}) [session-only]: ${job.prompt}`;
        });
        const llmContent = llmLines.join('\n');
        const displayLines = jobs.map((job) => `${job.id} ${humanReadableCron(job.cronExpr)}`);
        const returnDisplay = displayLines.join('\n');
        return { llmContent, returnDisplay };
    }
}
export class CronListTool extends BaseDeclarativeTool {
    config;
    static Name = ToolNames.CRON_LIST;
    constructor(config) {
        super(CronListTool.Name, ToolDisplayNames.CRON_LIST, 'List all cron jobs scheduled via CronCreate in this session.', Kind.Other, {
            type: 'object',
            properties: {},
            additionalProperties: false
        });
        this.config = config;
    }
    createInvocation(params) {
        return new CronListInvocation(this.config, params);
    }
}
//# sourceMappingURL=cron-list.js.map