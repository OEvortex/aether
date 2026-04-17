/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
import * as cp from 'node:child_process';
import * as net from 'node:net';
import type { JsonRpcMessage } from './types.js';
declare class JsonRpcConnection {
    private readonly writer;
    private readonly disposer?;
    private buffer;
    private nextId;
    private disposed;
    private pendingRequests;
    private notificationHandlers;
    private requestHandlers;
    constructor(writer: (data: string) => void, disposer?: (() => void) | undefined);
    listen(readable: NodeJS.ReadableStream): void;
    send(message: JsonRpcMessage): void;
    onNotification(handler: (notification: JsonRpcMessage) => void): void;
    onRequest(handler: (request: JsonRpcMessage) => Promise<unknown>): void;
    initialize(params: unknown): Promise<unknown>;
    shutdown(): Promise<void>;
    request(method: string, params: unknown): Promise<unknown>;
    end(): void;
    private sendRequest;
    private handleServerRequest;
    private handleData;
    private routeMessage;
    private writeMessage;
    private disposePending;
}
interface LspConnection {
    connection: JsonRpcConnection;
    process?: cp.ChildProcess;
    socket?: net.Socket;
}
interface SocketConnectionOptions {
    host?: string;
    port?: number;
    path?: string;
}
export declare class LspConnectionFactory {
    /**
     * 创建基于 stdio 的 LSP 连接
     */
    static createStdioConnection(command: string, args: string[], options?: cp.SpawnOptions, timeoutMs?: number): Promise<LspConnection>;
    /**
     * 创建基于 TCP 的 LSP 连接
     */
    static createTcpConnection(host: string, port: number, timeoutMs?: number): Promise<LspConnection>;
    /**
     * 创建基于 socket 的 LSP 连接（支持 TCP 或 unix socket）
     */
    static createSocketConnection(options: SocketConnectionOptions, timeoutMs?: number): Promise<LspConnection>;
    /**
     * 关闭 LSP 连接
     */
    static closeConnection(lspConnection: LspConnection): Promise<void>;
}
export {};
