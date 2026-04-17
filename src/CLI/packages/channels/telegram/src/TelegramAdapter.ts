import type { Envelope } from '../../base/src/index.js';
import { ChannelBase } from '../../base/src/index.js';

export class TelegramChannel extends ChannelBase {
    public async connect(): Promise<void> {}

    public async sendMessage(_chatId: string, _text: string): Promise<void> {}

    public override disconnect(): void {}

    protected override onPromptStart(_chatId: string): void {}

    protected override onPromptEnd(_chatId: string): void {}

    public override async handleInbound(_envelope: Envelope): Promise<void> {}
}
