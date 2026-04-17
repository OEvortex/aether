import { ChannelBase } from '../../base/src/index.js';
import { extractTitle, normalizeDingTalkMarkdown } from './markdown.js';
import { downloadMedia } from './media.js';
export class DingtalkChannel extends ChannelBase {
    async connect() { }
    async sendMessage(_chatId, _text) {
        void normalizeDingTalkMarkdown(_text);
        void extractTitle(_text);
        void downloadMedia();
    }
    async handleInbound(_envelope) { }
}
//# sourceMappingURL=DingtalkAdapter.js.map