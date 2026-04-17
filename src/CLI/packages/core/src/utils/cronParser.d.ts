/**
 * Minimal 5-field cron expression parser.
 *
 * Fields: minute (0-59), hour (0-23), day-of-month (1-31), month (1-12), day-of-week (0-7, 0 and 7=Sun)
 * Supports: *, single values, steps (asterisk/N), ranges (a-b), comma lists (a,b,c)
 * No extended syntax (L, W, ?, name aliases).
 */
interface CronFields {
    minute: Set<number>;
    hour: Set<number>;
    dayOfMonth: Set<number>;
    month: Set<number>;
    dayOfWeek: Set<number>;
    /** True when the day-of-month field was literally '*' (unrestricted). */
    domIsWild: boolean;
    /** True when the day-of-week field was literally '*' (unrestricted). */
    dowIsWild: boolean;
}
/**
 * Parses a 5-field cron expression into structured fields.
 * Throws on invalid expressions.
 */
export declare function parseCron(cronExpr: string): CronFields;
/**
 * Returns true if the given date matches the cron expression.
 *
 * Follows vixie-cron day semantics: when both day-of-month and day-of-week
 * are constrained (neither is `*`), the date matches if EITHER field matches.
 * When only one is constrained, it must match.
 */
export declare function matches(cronExpr: string, date: Date): boolean;
/**
 * Returns the next fire time after `after` for the given cron expression.
 * Scans forward minute-by-minute (up to ~4 years) to find the next match.
 */
export declare function nextFireTime(cronExpr: string, after: Date): Date;
export {};
