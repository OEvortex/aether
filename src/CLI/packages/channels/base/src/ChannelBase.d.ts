import type { AcpBridge, ChannelBaseOptions, ChannelConfig, Envelope, ToolCallEvent } from './types.js';
export declare abstract class ChannelBase {
    readonly name: string;
    protected readonly config: ChannelConfig;
    protected readonly options?: ChannelBaseOptions | undefined;
    protected bridge: AcpBridge;
    constructor(name: string, config: ChannelConfig, bridge: AcpBridge, options?: ChannelBaseOptions | undefined);
    setBridge(bridge: AcpBridge): void;
    abstract connect(): Promise<void>;
    disconnect(): void;
    handleInbound(_envelope: Envelope): Promise<void>;
    onToolCall(_chatId: string, _event: ToolCallEvent): void;
    protected onPromptStart(_chatId: string, _sessionId?: string, _messageId?: string): void;
    protected onPromptEnd(_chatId: string, _sessionId?: string, _messageId?: string): void;
    abstract sendMessage(chatId: string, text: string): Promise<void>;
}
