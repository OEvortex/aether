/**
 * cron_delete tool — deletes an in-session cron job by ID.
 */
import { ToolDisplayNames, ToolNames } from './tool-names.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';
class CronDeleteInvocation extends BaseToolInvocation {
    config;
    constructor(config, params) {
        super(params);
        this.config = config;
    }
    getDescription() {
        return this.params.id;
    }
    async execute() {
        const scheduler = this.config.getCronScheduler();
        const deleted = scheduler.delete(this.params.id);
        if (deleted) {
            const llmContent = `Cancelled job ${this.params.id}.`;
            const returnDisplay = `Cancelled ${this.params.id}`;
            return { llmContent, returnDisplay };
        }
        else {
            const result = `Job ${this.params.id} not found.`;
            return {
                llmContent: result,
                returnDisplay: result,
                error: { message: result }
            };
        }
    }
}
export class CronDeleteTool extends BaseDeclarativeTool {
    config;
    static Name = ToolNames.CRON_DELETE;
    constructor(config) {
        super(CronDeleteTool.Name, ToolDisplayNames.CRON_DELETE, 'Cancel a cron job previously scheduled with CronCreate. Removes it from the in-memory session store.', Kind.Other, {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    description: 'Job ID returned by CronCreate.'
                }
            },
            required: ['id'],
            additionalProperties: false
        });
        this.config = config;
    }
    createInvocation(params) {
        return new CronDeleteInvocation(this.config, params);
    }
}
//# sourceMappingURL=cron-delete.js.map