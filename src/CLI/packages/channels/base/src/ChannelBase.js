export class ChannelBase {
    name;
    config;
    options;
    bridge;
    constructor(name, config, bridge, options) {
        this.name = name;
        this.config = config;
        this.options = options;
        this.bridge = bridge;
    }
    setBridge(bridge) {
        this.bridge = bridge;
    }
    disconnect() { }
    async handleInbound(_envelope) { }
    onToolCall(_chatId, _event) { }
    onPromptStart(_chatId, _sessionId, _messageId) { }
    onPromptEnd(_chatId, _sessionId, _messageId) { }
}
//# sourceMappingURL=ChannelBase.js.map