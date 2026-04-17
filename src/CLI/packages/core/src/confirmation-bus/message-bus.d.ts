/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { EventEmitter } from 'node:events';
import { type Message } from './types.js';
export declare class MessageBus extends EventEmitter {
    private readonly debug;
    constructor(debug?: boolean);
    private isValidMessage;
    private emitMessage;
    publish(message: Message): Promise<void>;
    subscribe<T extends Message>(type: T['type'], listener: (message: T) => void): void;
    unsubscribe<T extends Message>(type: T['type'], listener: (message: T) => void): void;
    /**
     * Request-response pattern: Publish a message and wait for a correlated response
     * This enables synchronous-style communication over the async MessageBus
     * The correlation ID is generated internally and added to the request
     */
    request<TRequest extends Message, TResponse extends Message>(request: Omit<TRequest, 'correlationId'>, responseType: TResponse['type'], timeoutMs?: number, signal?: AbortSignal): Promise<TResponse>;
}
