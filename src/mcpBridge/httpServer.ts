/*---------------------------------------------------------------------------------------------
 *  MCP Bridge HTTP Server
 *  Exposes VS Code LM tools via MCP protocol over HTTP
 *--------------------------------------------------------------------------------------------*/

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { invokeLmTool } from './invocation';
import type { BridgedTool, HttpMcpServer, HttpMcpServerOptions } from './types';

export async function startHttpMcpServer(
    options: HttpMcpServerOptions
): Promise<HttpMcpServer> {
    const {
        port: requestedPort,
        registry,
        outputChannel,
        onInvocation,
        onToolBlocked
    } = options;

    const MAX_SESSIONS = 100;
    const SESSION_TTL_MS = 30 * 60 * 1000;

    interface SessionEntry {
        server: Server;
        transport: StreamableHTTPServerTransport;
    }

    const sessionEntries = new Map<string, SessionEntry>();
    const sessionTransports = new Map<string, StreamableHTTPServerTransport>();
    const sessionLastAccess = new Map<string, number>();
    const sessionTimers = new Map<string, ReturnType<typeof setTimeout>>();

    function touchSession(sid: string): void {
        sessionLastAccess.set(sid, Date.now());
        const existing = sessionTimers.get(sid);
        if (existing !== undefined) {
            clearTimeout(existing);
        }
        sessionTimers.set(
            sid,
            setTimeout(() => {
                void evictSession(sid);
            }, SESSION_TTL_MS)
        );
    }

    async function evictSession(sid: string): Promise<void> {
        const entry = sessionEntries.get(sid);
        deleteSession(sid);
        if (entry !== undefined) {
            try {
                await entry.transport.close();
            } catch {}
        }
        outputChannel?.appendLine(`[HttpServer] Evicted session: ${sid}`);
    }

    function deleteSession(sid: string): void {
        sessionEntries.delete(sid);
        sessionTransports.delete(sid);
        sessionLastAccess.delete(sid);
        const timer = sessionTimers.get(sid);
        if (timer !== undefined) {
            clearTimeout(timer);
            sessionTimers.delete(sid);
        }
    }

    function evictLru(): void {
        let oldestSid: string | undefined;
        let oldestTime = Infinity;
        for (const [sid, time] of sessionLastAccess) {
            if (time < oldestTime) {
                oldestTime = time;
                oldestSid = sid;
            }
        }
        if (oldestSid !== undefined) {
            void evictSession(oldestSid);
        }
    }

    function createMcpServer(): Server {
        const server = new Server(
            { name: 'aether-mcp-bridge', version: '0.1.0' },
            { capabilities: { tools: { listChanged: true } } }
        );

        server.setRequestHandler(ListToolsRequestSchema, () => {
            const exposedTools = registry.getExposedTools();
            outputChannel?.appendLine(
                `[HttpServer] ListTools request, exposed tools: ${exposedTools.length}`
            );
            for (const t of exposedTools) {
                outputChannel?.appendLine(
                    `[HttpServer]   - ${t.name} (exposed=${t.exposed}, disabled=${t.disabledInVscode})`
                );
            }

            const tools = exposedTools.map((tool: BridgedTool) => {
                const raw = tool.inputSchema;
                const inputSchema =
                    raw !== undefined &&
                    typeof raw === 'object' &&
                    raw.type === 'object'
                        ? raw
                        : {
                              type: 'object' as const,
                              properties:
                                  (raw as Record<string, unknown>)
                                      ?.properties ?? {}
                          };
                return {
                    name: tool.name,
                    description: tool.description,
                    inputSchema
                };
            });
            return { tools };
        });

        server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            const input: Record<string, unknown> = (args ?? {}) as Record<
                string,
                unknown
            >;

            outputChannel?.appendLine(`[HttpServer] CallTool request: ${name}`);

            const toolEntry = registry.getTool(name);
            if (
                toolEntry !== undefined &&
                (!toolEntry.exposed || toolEntry.disabledInVscode)
            ) {
                const blockedReason: 'hidden' | 'disabled' =
                    toolEntry.disabledInVscode ? 'disabled' : 'hidden';
                const reason = toolEntry.disabledInVscode
                    ? `Tool "${name}" is disabled in VS Code`
                    : `Tool "${name}" is hidden. Enable it in Aether MCP Bridge panel`;
                outputChannel?.appendLine(
                    `[HttpServer] Tool ${name} blocked (${blockedReason})`
                );
                onToolBlocked?.(name, blockedReason);
                return {
                    content: [{ type: 'text' as const, text: reason }],
                    isError: true
                };
            }

            const result = await invokeLmTool(name, input, registry);
            onInvocation?.(result.logEntry);

            if (result.logEntry.status === 'success') {
                outputChannel?.appendLine(
                    `[HttpServer] Tool ${name} invoked successfully (${result.logEntry.durationMs}ms)`
                );
            } else {
                outputChannel?.appendLine(
                    `[HttpServer] Tool ${name} failed (${result.logEntry.durationMs}ms): ${result.logEntry.errorMessage}`
                );
            }

            return {
                content: result.content,
                isError: result.isError
            };
        });

        return server;
    }

    async function createSession(): Promise<SessionEntry> {
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => crypto.randomUUID(),
            enableJsonResponse: true
        });

        const server = createMcpServer();
        await server.connect(transport);

        transport.onclose = () => {
            const sid = transport.sessionId;
            if (sid !== undefined) {
                deleteSession(sid);
                outputChannel?.appendLine(
                    `[HttpServer] Session closed: ${sid}`
                );
            }
        };

        return { server, transport };
    }

    const toolChangeDisposable = registry.onDidChangeTools(() => {
        const exposedCount = registry.getExposedTools().length;
        outputChannel?.appendLine(
            `[HttpServer] Tools changed, exposed: ${exposedCount}`
        );
        for (const [, entry] of sessionEntries) {
            try {
                void entry.server.sendToolListChanged();
            } catch {}
        }
    });

    const httpServer = http.createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader(
            'Access-Control-Allow-Methods',
            'GET, POST, DELETE, OPTIONS'
        );
        res.setHeader(
            'Access-Control-Allow-Headers',
            'Content-Type, Authorization, Mcp-Session-Id, Accept'
        );

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        const urlPath = req.url || '';

        if (urlPath === '/health' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
                JSON.stringify({
                    status: 'ok',
                    tools: registry.getExposedTools().length,
                    sessions: sessionTransports.size
                })
            );
            return;
        }

        if (urlPath === '/mcp' || urlPath === '/mcp/') {
            void handleMcpRequest(req, res);
            return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    });

    const MAX_BODY_BYTES = 1 * 1024 * 1024;

    async function handleMcpRequest(
        req: http.IncomingMessage,
        res: http.ServerResponse
    ): Promise<void> {
        if (req.method === 'POST') {
            const chunks: Buffer[] = [];
            let totalBytes = 0;

            const bodyResult = await new Promise<
                'complete' | 'tooLarge' | 'aborted'
            >((resolve) => {
                const onData = (chunk: Buffer): void => {
                    totalBytes += chunk.length;
                    if (totalBytes > MAX_BODY_BYTES) {
                        cleanup();
                        res.writeHead(413, {
                            'Content-Type': 'application/json'
                        });
                        res.end(JSON.stringify({ error: 'Payload too large' }));
                        req.destroy();
                        resolve('tooLarge');
                        return;
                    }
                    chunks.push(chunk);
                };
                const onEnd = (): void => {
                    cleanup();
                    resolve('complete');
                };
                const onAborted = (): void => {
                    cleanup();
                    resolve('aborted');
                };
                const cleanup = (): void => {
                    req.off('data', onData);
                    req.off('end', onEnd);
                    req.off('aborted', onAborted);
                };
                req.on('data', onData);
                req.on('end', onEnd);
                req.on('aborted', onAborted);
            });

            if (bodyResult !== 'complete') {
                return;
            }

            const bodyStr = Buffer.concat(chunks).toString('utf-8');
            let parsedBody: unknown;
            try {
                parsedBody = JSON.parse(bodyStr);
            } catch {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
                return;
            }

            const sessionId = req.headers['mcp-session-id'] as
                | string
                | undefined;
            let transport: StreamableHTTPServerTransport;
            let pendingEntry: SessionEntry | undefined;

            if (sessionId !== undefined && sessionTransports.has(sessionId)) {
                transport = sessionTransports.get(sessionId)!;
                touchSession(sessionId);
                outputChannel?.appendLine(
                    `[HttpServer] Using existing session: ${sessionId}`
                );
            } else {
                if (sessionEntries.size >= MAX_SESSIONS) {
                    evictLru();
                }
                pendingEntry = await createSession();
                transport = pendingEntry.transport;
                outputChannel?.appendLine('[HttpServer] Created new session');
            }

            await transport.handleRequest(req, res, parsedBody);

            if (
                pendingEntry !== undefined &&
                transport.sessionId !== undefined
            ) {
                sessionEntries.set(transport.sessionId, pendingEntry);
                sessionTransports.set(transport.sessionId, transport);
                touchSession(transport.sessionId);
                outputChannel?.appendLine(
                    `[HttpServer] Registered session: ${transport.sessionId}`
                );
            }
        } else if (req.method === 'GET' || req.method === 'DELETE') {
            const sessionId = req.headers['mcp-session-id'] as
                | string
                | undefined;
            if (sessionId !== undefined && sessionTransports.has(sessionId)) {
                const transport = sessionTransports.get(sessionId)!;
                touchSession(sessionId);
                await transport.handleRequest(req, res);
            } else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(
                    JSON.stringify({ error: 'Invalid or missing session' })
                );
            }
        } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    }

    function writeClaudeConfig(): void {
        try {
            const homeDir = os.homedir();
            const claudeJsonPath = path.join(homeDir, '.claude.json');

            let claudeConfig: Record<string, unknown> = {};
            try {
                const existingContent = fs.readFileSync(
                    claudeJsonPath,
                    'utf-8'
                );
                claudeConfig = JSON.parse(existingContent);
            } catch {}

            const mcpServers =
                (claudeConfig.mcpServers as Record<string, unknown>) || {};

            const serverConfig = {
                type: 'http' as const,
                url: `http://127.0.0.1:${requestedPort}/mcp`
            };

            const serverKey = 'aether-mcp-bridge';
            const existingServer = mcpServers[serverKey] as
                | Record<string, unknown>
                | undefined;
            const needsUpdate =
                !existingServer || existingServer.url !== serverConfig.url;

            if (needsUpdate) {
                mcpServers[serverKey] = serverConfig;
                claudeConfig.mcpServers = mcpServers;
                fs.writeFileSync(
                    claudeJsonPath,
                    JSON.stringify(claudeConfig, null, 2),
                    'utf-8'
                );
                outputChannel?.appendLine(
                    '[HttpServer] Updated ~/.claude.json for auto-discovery'
                );
            }
        } catch (error) {
            outputChannel?.appendLine(
                `[HttpServer] Failed to write ~/.claude.json: ${String(error)}`
            );
        }
    }

    const actualPort = await new Promise<number>((resolve, reject) => {
        httpServer.listen(requestedPort, '127.0.0.1', () => {
            const addr = httpServer.address();
            if (addr !== null && typeof addr !== 'string') {
                resolve(addr.port);
            } else {
                reject(new Error('Failed to get server address'));
            }
        });
        httpServer.on('error', reject);
    });

    outputChannel?.appendLine(
        `[HttpServer] Listening on http://127.0.0.1:${actualPort}/mcp`
    );
    outputChannel?.appendLine(
        `[HttpServer] Health check: http://127.0.0.1:${actualPort}/health`
    );

    const exposedTools = registry.getExposedTools();
    outputChannel?.appendLine(
        `[HttpServer] Currently exposed tools: ${exposedTools.length}`
    );
    for (const tool of exposedTools) {
        outputChannel?.appendLine(
            `[HttpServer]   - ${tool.name} (${tool.extensionDisplayName})`
        );
    }

    writeClaudeConfig();

    return {
        port: actualPort,
        async dispose() {
            toolChangeDisposable.dispose();
            for (const [, entry] of sessionEntries) {
                try {
                    await entry.transport.close();
                } catch {}
            }
            sessionEntries.clear();
            sessionTransports.clear();
            sessionLastAccess.clear();
            for (const timer of sessionTimers.values()) {
                clearTimeout(timer);
            }
            sessionTimers.clear();
            await new Promise<void>((resolve) =>
                httpServer.close(() => resolve())
            );
            outputChannel?.appendLine(
                `[HttpServer] Stopped on port ${actualPort}`
            );
        }
    };
}
