import type { Envelope } from '../../base/src/index.js';
import { ChannelBase } from '../../base/src/index.js';
export declare class DingtalkChannel extends ChannelBase {
    connect(): Promise<void>;
    sendMessage(_chatId: string, _text: string): Promise<void>;
    handleInbound(_envelope: Envelope): Promise<void>;
}
