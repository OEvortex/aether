import { ChannelBase } from '../../base/src/index.js';
export class TelegramChannel extends ChannelBase {
    async connect() { }
    async sendMessage(_chatId, _text) { }
    disconnect() { }
    onPromptStart(_chatId) { }
    onPromptEnd(_chatId) { }
    async handleInbound(_envelope) { }
}
//# sourceMappingURL=TelegramAdapter.js.map