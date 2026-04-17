import { EventEmitter } from 'node:events';
import type { AcpBridgeOptions, ToolCallEvent } from './types.js';
export declare class AcpBridge extends EventEmitter {
    readonly options: AcpBridgeOptions;
    private started;
    constructor(options: AcpBridgeOptions);
    start(): Promise<void>;
    stop(): void;
    sendToolCall(event: ToolCallEvent): void;
}
