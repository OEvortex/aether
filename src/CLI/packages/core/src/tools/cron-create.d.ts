/**
 * cron_create tool — creates a new in-session cron job.
 */
import type { Config } from '../config/config.js';
import type { ToolInvocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool } from './tools.js';
export interface CronCreateParams {
    cron: string;
    prompt: string;
    recurring?: boolean;
}
export declare class CronCreateTool extends BaseDeclarativeTool<CronCreateParams, ToolResult> {
    private config;
    static readonly Name: "cron_create";
    constructor(config: Config);
    protected createInvocation(params: CronCreateParams): ToolInvocation<CronCreateParams, ToolResult>;
}
