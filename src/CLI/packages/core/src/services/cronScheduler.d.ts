/**
 * In-session cron scheduler. Jobs live in memory and are gone when the
 * process exits. Ticks every second, fires callbacks when jobs are due.
 */
export interface CronJob {
    id: string;
    cronExpr: string;
    prompt: string;
    recurring: boolean;
    createdAt: number;
    expiresAt: number;
    lastFiredAt?: number;
    jitterMs: number;
}
export declare class CronScheduler {
    private jobs;
    private timer;
    private onFire;
    /**
     * Creates a new cron job. Returns the created job.
     * Throws if the max job limit is reached.
     */
    create(cronExpr: string, prompt: string, recurring: boolean): CronJob;
    /**
     * Deletes a job by ID. Returns true if the job existed.
     */
    delete(id: string): boolean;
    /**
     * Returns all active jobs.
     */
    list(): CronJob[];
    /**
     * Returns the number of active jobs.
     */
    get size(): number;
    /**
     * Starts the scheduler tick. Calls `onFire` when a job is due.
     * Only fires when called — does not auto-fire missed intervals.
     */
    start(onFire: (job: CronJob) => void): void;
    /**
     * Stops the scheduler. Does not clear jobs — they remain queryable.
     */
    stop(): void;
    /**
     * Returns true if the scheduler is running.
     */
    get running(): boolean;
    /**
     * Manual tick — checks all jobs against the current time and fires those
     * that are due. Exported for testing.
     */
    tick(now?: Date): void;
    /**
     * Returns a human-readable summary of active jobs for display on session
     * exit. Returns null if there are no active jobs.
     */
    getExitSummary(): string | null;
    /**
     * Clears all jobs and stops the scheduler.
     */
    destroy(): void;
}
