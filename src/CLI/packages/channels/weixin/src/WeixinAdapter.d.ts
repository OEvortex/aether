import { ChannelBase } from '../../base/src/index.js';
export declare class WeixinChannel extends ChannelBase {
    connect(): Promise<void>;
    sendMessage(_chatId: string, _text: string): Promise<void>;
}
