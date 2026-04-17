import { ChannelBase } from '../../base/src/index.js';
import { loadAccount } from './accounts.js';

export class WeixinChannel extends ChannelBase {
    public async connect(): Promise<void> {
        void loadAccount();
    }

    public async sendMessage(_chatId: string, _text: string): Promise<void> {}
}
