import type { AcpBridge, SessionRouterState, SessionScope, SessionTarget } from './types.js';
export declare class SessionRouter {
    private readonly targets;
    private readonly sessionScopes;
    constructor(_bridge: AcpBridge, _cwd: string, _sessionScope: SessionScope, _sessionsPath: string);
    getTarget(sessionId: string): SessionTarget | undefined;
    setBridge(_bridge: AcpBridge): void;
    setChannelScope(channelName: string, sessionScope: SessionScope): void;
    clearAll(): void;
    restoreSessions(): Promise<SessionRouterState>;
}
