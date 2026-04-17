/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createModelContent, createUserContent } from '@google/genai';
import { createDebugLogger } from '../utils/debugLogger.js';
import { getGitBranch } from '../utils/gitUtils.js';
import * as jsonl from '../utils/jsonl-utils.js';
const debugLogger = createDebugLogger('CHAT_RECORDING');
/**
 * Service for recording the current chat session to disk.
 *
 * This service provides comprehensive conversation recording that captures:
 * - All user and assistant messages
 * - Tool calls and their execution results
 * - Token usage statistics
 * - Assistant thoughts and reasoning
 *
 * **API Design:**
 * - `recordUserMessage()` - Records a user message (immediate write)
 * - `recordAssistantTurn()` - Records an assistant turn with all data (immediate write)
 * - `recordToolResult()` - Records tool results (immediate write)
 *
 * **Storage Format:** JSONL files with tree-structured records.
 * Each record has uuid/parentUuid fields enabling:
 * - Append-only writes (never rewrite the file)
 * - Linear history reconstruction
 * - Future checkpointing (branch from any historical point)
 *
 * File location: ~/.aether/tmp/<project_id>/chats/
 *
 * For session management (list, load, remove), use SessionService.
 */
export class ChatRecordingService {
    /** UUID of the last written record in the chain */
    lastRecordUuid = null;
    config;
    constructor(config) {
        this.config = config;
        this.lastRecordUuid =
            config.getResumedSessionData()?.lastCompletedUuid ?? null;
    }
    /**
     * Returns the session ID.
     * @returns The session ID.
     */
    getSessionId() {
        return this.config.getSessionId();
    }
    /**
     * Ensures the chats directory exists, creating it if it doesn't exist.
     * @returns The path to the chats directory.
     * @throws Error if the directory cannot be created.
     */
    ensureChatsDir() {
        const projectDir = this.config.storage.getProjectDir();
        const chatsDir = path.join(projectDir, 'chats');
        try {
            fs.mkdirSync(chatsDir, { recursive: true });
        }
        catch {
            // Ignore errors - directory will be created if it doesn't exist
        }
        return chatsDir;
    }
    /**
     * Ensures the conversation file exists, creating it if it doesn't exist.
     * Uses atomic file creation to avoid race conditions.
     * @returns The path to the conversation file.
     * @throws Error if the file cannot be created or accessed.
     */
    ensureConversationFile() {
        const chatsDir = this.ensureChatsDir();
        const sessionId = this.getSessionId();
        const safeFilename = `${sessionId}.jsonl`;
        const conversationFile = path.join(chatsDir, safeFilename);
        if (fs.existsSync(conversationFile)) {
            return conversationFile;
        }
        try {
            // Use 'wx' flag for exclusive creation - atomic operation that fails if file exists
            // This avoids the TOCTOU race condition of existsSync + writeFileSync
            fs.writeFileSync(conversationFile, '', {
                flag: 'wx',
                encoding: 'utf8'
            });
        }
        catch (error) {
            const nodeError = error;
            // EEXIST means file already exists, which is expected and fine
            if (nodeError.code !== 'EEXIST') {
                const message = error instanceof Error ? error.message : String(error);
                throw new Error(`Failed to create conversation file at ${conversationFile}: ${message}`);
            }
        }
        return conversationFile;
    }
    /**
     * Creates base fields for a ChatRecord.
     */
    createBaseRecord(type) {
        return {
            uuid: randomUUID(),
            parentUuid: this.lastRecordUuid,
            sessionId: this.getSessionId(),
            timestamp: new Date().toISOString(),
            type,
            cwd: this.config.getProjectRoot(),
            version: this.config.getCliVersion() || 'unknown',
            gitBranch: getGitBranch(this.config.getProjectRoot())
        };
    }
    /**
     * Appends a record to the session file and updates lastRecordUuid.
     */
    appendRecord(record) {
        try {
            const conversationFile = this.ensureConversationFile();
            jsonl.writeLineSync(conversationFile, record);
            this.lastRecordUuid = record.uuid;
        }
        catch (error) {
            debugLogger.error('Error appending record:', error);
            throw error;
        }
    }
    /**
     * Records a user message.
     * Writes immediately to disk.
     *
     * @param message The raw PartListUnion object as used with the API
     */
    recordUserMessage(message) {
        try {
            const record = {
                ...this.createBaseRecord('user'),
                message: createUserContent(message)
            };
            this.appendRecord(record);
        }
        catch (error) {
            debugLogger.error('Error saving user message:', error);
        }
    }
    /**
     * Records an assistant turn with all available data.
     * Writes immediately to disk.
     *
     * @param data.message The raw PartListUnion object from the model response
     * @param data.model The model name
     * @param data.tokens Token usage statistics
     * @param data.contextWindowSize Context window size of the model
     * @param data.toolCallsMetadata Enriched tool call info for UI recovery
     */
    recordAssistantTurn(data) {
        try {
            const record = {
                ...this.createBaseRecord('assistant'),
                model: data.model
            };
            if (data.message !== undefined) {
                record.message = createModelContent(data.message);
            }
            if (data.tokens) {
                record.usageMetadata = data.tokens;
            }
            if (data.contextWindowSize !== undefined) {
                record.contextWindowSize = data.contextWindowSize;
            }
            this.appendRecord(record);
        }
        catch (error) {
            debugLogger.error('Error saving assistant turn:', error);
        }
    }
    /**
     * Records tool results (function responses) sent back to the model.
     * Writes immediately to disk.
     *
     * @param message The raw PartListUnion object with functionResponse parts
     * @param toolCallResult Optional tool call result info for UI recovery
     */
    recordToolResult(message, toolCallResult) {
        try {
            const record = {
                ...this.createBaseRecord('tool_result'),
                message: createUserContent(message)
            };
            if (toolCallResult) {
                // special case for task executions - we don't want to record the tool calls
                if (typeof toolCallResult.resultDisplay === 'object' &&
                    toolCallResult.resultDisplay !== null &&
                    'type' in toolCallResult.resultDisplay &&
                    toolCallResult.resultDisplay.type === 'task_execution') {
                    const taskResult = toolCallResult.resultDisplay;
                    record.toolCallResult = {
                        ...toolCallResult,
                        resultDisplay: {
                            ...taskResult,
                            toolCalls: []
                        }
                    };
                }
                else {
                    record.toolCallResult = toolCallResult;
                }
            }
            this.appendRecord(record);
        }
        catch (error) {
            debugLogger.error('Error saving tool result:', error);
        }
    }
    /**
     * Records a slash command invocation as a system record. This keeps the model
     * history clean while allowing resume to replay UI output for commands like
     * /about.
     */
    recordSlashCommand(payload) {
        try {
            const record = {
                ...this.createBaseRecord('system'),
                type: 'system',
                subtype: 'slash_command',
                systemPayload: payload
            };
            this.appendRecord(record);
        }
        catch (error) {
            debugLogger.error('Error saving slash command record:', error);
        }
    }
    /**
     * Records a chat compression checkpoint as a system record. This keeps the UI
     * history immutable while allowing resume/continue flows to reconstruct the
     * compressed model-facing history from the stored snapshot.
     */
    recordChatCompression(payload) {
        try {
            const record = {
                ...this.createBaseRecord('system'),
                type: 'system',
                subtype: 'chat_compression',
                systemPayload: payload
            };
            this.appendRecord(record);
        }
        catch (error) {
            debugLogger.error('Error saving chat compression record:', error);
        }
    }
    /**
     * Records a UI telemetry event for replaying metrics on resume.
     */
    recordUiTelemetryEvent(uiEvent) {
        try {
            const record = {
                ...this.createBaseRecord('system'),
                type: 'system',
                subtype: 'ui_telemetry',
                systemPayload: { uiEvent }
            };
            this.appendRecord(record);
        }
        catch (error) {
            debugLogger.error('Error saving ui telemetry record:', error);
        }
    }
    /**
     * Records @-command metadata as a system record for UI reconstruction.
     */
    recordAtCommand(payload) {
        try {
            const record = {
                ...this.createBaseRecord('system'),
                type: 'system',
                subtype: 'at_command',
                systemPayload: payload
            };
            this.appendRecord(record);
        }
        catch (error) {
            debugLogger.error('Error saving @-command record:', error);
        }
    }
}
//# sourceMappingURL=chatRecordingService.js.map