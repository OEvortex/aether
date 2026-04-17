import type {
    AcpBridge,
    ChannelBaseOptions,
    ChannelConfig,
    Envelope
} from '../../base/src/index.js';
import { ChannelBase } from '../../base/src/index.js';

export class TelegramChannel extends ChannelBase {
    public constructor(
        name: string,
        config: ChannelConfig,
        bridge: AcpBridge,
        options?: ChannelBaseOptions
    ) {
        super(name, config, bridge, options);
    }

    public async connect(): Promise<void> {}

    public async sendMessage(_chatId: string, _text: string): Promise<void> {}

    public override disconnect(): void {}

    protected override onPromptStart(_chatId: string): void {}

    protected override onPromptEnd(_chatId: string): void {}

    public override async handleInbound(_envelope: Envelope): Promise<void> {}
}
