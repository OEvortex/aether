export class SessionRouter {
    targets = new Map();
    sessionScopes = new Map();
    constructor(_bridge, _cwd, _sessionScope, _sessionsPath) {
        this.sessionScopes.set('*', _sessionScope);
    }
    getTarget(sessionId) {
        return this.targets.get(sessionId);
    }
    setBridge(_bridge) { }
    setChannelScope(channelName, sessionScope) {
        this.sessionScopes.set(channelName, sessionScope);
    }
    clearAll() {
        this.targets.clear();
    }
    async restoreSessions() {
        return { restored: 0, failed: 0 };
    }
}
//# sourceMappingURL=SessionRouter.js.map