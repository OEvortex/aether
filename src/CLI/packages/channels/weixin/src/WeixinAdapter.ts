import { ChannelBase } from '../../base/src/index.js';
import type { AcpBridge, ChannelBaseOptions, ChannelConfig } from '../../base/src/index.js';
import { loadAccount } from './accounts.js';

export class WeixinChannel extends ChannelBase {
    public constructor(
        name: string,
        config: ChannelConfig,
        bridge: AcpBridge,
        options?: ChannelBaseOptions,
    ) {
        super(name, config, bridge, options);
    }

    public async connect(): Promise<void> {
        void loadAccount();
    }

    public async sendMessage(_chatId: string, _text: string): Promise<void> {}
}
