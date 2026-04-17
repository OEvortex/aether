export interface GroupCheckResult {
    allowed: boolean;
    reason?: string;
}
export declare class GroupGate {
    check(): GroupCheckResult;
}
