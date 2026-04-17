/**
 * cron_list tool — lists all active in-session cron jobs.
 */
import type { Config } from '../config/config.js';
import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool } from './tools.js';
export type CronListParams = Record<string, never>;
export declare class CronListTool extends BaseDeclarativeTool<CronListParams, ToolResult> {
    private config;
    static readonly Name: "cron_list";
    constructor(config: Config);
    protected createInvocation(params: CronListParams): ToolInvocation<CronListParams, ToolResult>;
}
