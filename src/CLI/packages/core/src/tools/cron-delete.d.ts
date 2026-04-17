/**
 * cron_delete tool — deletes an in-session cron job by ID.
 */
import type { Config } from '../config/config.js';
import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool } from './tools.js';
export interface CronDeleteParams {
    id: string;
}
export declare class CronDeleteTool extends BaseDeclarativeTool<CronDeleteParams, ToolResult> {
    private config;
    static readonly Name: "cron_delete";
    constructor(config: Config);
    protected createInvocation(params: CronDeleteParams): ToolInvocation<CronDeleteParams, ToolResult>;
}
