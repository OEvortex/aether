/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Tool name constants to avoid circular dependencies.
 * These constants are used across multiple files and should be kept in sync
 * with the actual tool class names.
 */
export declare const ToolNames: {
    readonly EDIT: "edit";
    readonly WRITE_FILE: "write_file";
    readonly READ_FILE: "read_file";
    readonly GREP: "grep_search";
    readonly GLOB: "glob";
    readonly SHELL: "run_shell_command";
    readonly TODO_WRITE: "todo_write";
    readonly MEMORY: "save_memory";
    readonly AGENT: "agent";
    readonly SKILL: "skill";
    readonly EXIT_PLAN_MODE: "exit_plan_mode";
    readonly WEB_FETCH: "web_fetch";
    readonly WEB_SEARCH: "web_search";
    readonly LS: "list_directory";
    readonly LSP: "lsp";
    readonly ASK_USER_QUESTION: "ask_user_question";
    readonly CRON_CREATE: "cron_create";
    readonly CRON_LIST: "cron_list";
    readonly CRON_DELETE: "cron_delete";
};
/**
 * Tool display name constants to avoid circular dependencies.
 * These constants are used across multiple files and should be kept in sync
 * with the actual tool display names.
 */
export declare const ToolDisplayNames: {
    readonly EDIT: "Edit";
    readonly WRITE_FILE: "WriteFile";
    readonly READ_FILE: "ReadFile";
    readonly GREP: "Grep";
    readonly GLOB: "Glob";
    readonly SHELL: "Shell";
    readonly TODO_WRITE: "TodoWrite";
    readonly MEMORY: "SaveMemory";
    readonly AGENT: "Agent";
    readonly SKILL: "Skill";
    readonly EXIT_PLAN_MODE: "ExitPlanMode";
    readonly WEB_FETCH: "WebFetch";
    readonly WEB_SEARCH: "WebSearch";
    readonly LS: "ListFiles";
    readonly LSP: "Lsp";
    readonly ASK_USER_QUESTION: "AskUserQuestion";
    readonly CRON_CREATE: "CronCreate";
    readonly CRON_LIST: "CronList";
    readonly CRON_DELETE: "CronDelete";
};
export declare const ToolNamesMigration: {
    readonly search_file_content: "grep_search";
    readonly replace: "edit";
    readonly task: "agent";
};
export declare const ToolDisplayNamesMigration: {
    readonly SearchFiles: "Grep";
    readonly FindFiles: "Glob";
    readonly ReadFolder: "ListFiles";
    readonly Task: "Agent";
};
