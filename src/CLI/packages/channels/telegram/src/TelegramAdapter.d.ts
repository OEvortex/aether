import type { Envelope } from '../../base/src/index.js';
import { ChannelBase } from '../../base/src/index.js';
export declare class TelegramChannel extends ChannelBase {
    connect(): Promise<void>;
    sendMessage(_chatId: string, _text: string): Promise<void>;
    disconnect(): void;
    protected onPromptStart(_chatId: string): void;
    protected onPromptEnd(_chatId: string): void;
    handleInbound(_envelope: Envelope): Promise<void>;
}
