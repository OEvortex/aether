import type { Envelope } from '../../base/src/index.js';
import { ChannelBase } from '../../base/src/index.js';
import { extractTitle, normalizeDingTalkMarkdown } from './markdown.js';
import { downloadMedia } from './media.js';

export class DingtalkChannel extends ChannelBase {
    public async connect(): Promise<void> {}

    public async sendMessage(_chatId: string, _text: string): Promise<void> {
        void normalizeDingTalkMarkdown(_text);
        void extractTitle(_text);
        void downloadMedia();
    }

    public override async handleInbound(_envelope: Envelope): Promise<void> {}
}
