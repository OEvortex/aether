import { ChannelBase } from '../../base/src/index.js';
import { loadAccount } from './accounts.js';
export class WeixinChannel extends ChannelBase {
    async connect() {
        void loadAccount();
    }
    async sendMessage(_chatId, _text) { }
}
//# sourceMappingURL=WeixinAdapter.js.map