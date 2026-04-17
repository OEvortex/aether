export interface SenderCheckResult {
    allowed: boolean;
    reason?: string;
}
export declare class SenderGate {
    check(): SenderCheckResult;
}
