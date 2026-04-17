/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * A type-safe enum for tool-related errors.
 */
export var ToolErrorType;
(function (ToolErrorType) {
    // General Errors
    ToolErrorType["INVALID_TOOL_PARAMS"] = "invalid_tool_params";
    ToolErrorType["UNKNOWN"] = "unknown";
    ToolErrorType["UNHANDLED_EXCEPTION"] = "unhandled_exception";
    ToolErrorType["TOOL_NOT_REGISTERED"] = "tool_not_registered";
    ToolErrorType["EXECUTION_FAILED"] = "execution_failed";
    // Try to execute a tool that is excluded due to the approval mode
    ToolErrorType["EXECUTION_DENIED"] = "execution_denied";
    // File System Errors
    ToolErrorType["FILE_NOT_FOUND"] = "file_not_found";
    ToolErrorType["FILE_WRITE_FAILURE"] = "file_write_failure";
    ToolErrorType["READ_CONTENT_FAILURE"] = "read_content_failure";
    ToolErrorType["ATTEMPT_TO_CREATE_EXISTING_FILE"] = "attempt_to_create_existing_file";
    ToolErrorType["FILE_TOO_LARGE"] = "file_too_large";
    ToolErrorType["PERMISSION_DENIED"] = "permission_denied";
    ToolErrorType["NO_SPACE_LEFT"] = "no_space_left";
    ToolErrorType["TARGET_IS_DIRECTORY"] = "target_is_directory";
    ToolErrorType["PATH_NOT_IN_WORKSPACE"] = "path_not_in_workspace";
    ToolErrorType["SEARCH_PATH_NOT_FOUND"] = "search_path_not_found";
    ToolErrorType["SEARCH_PATH_NOT_A_DIRECTORY"] = "search_path_not_a_directory";
    // Edit-specific Errors
    ToolErrorType["EDIT_PREPARATION_FAILURE"] = "edit_preparation_failure";
    ToolErrorType["EDIT_NO_OCCURRENCE_FOUND"] = "edit_no_occurrence_found";
    ToolErrorType["EDIT_EXPECTED_OCCURRENCE_MISMATCH"] = "edit_expected_occurrence_mismatch";
    ToolErrorType["EDIT_NO_CHANGE"] = "edit_no_change";
    ToolErrorType["EDIT_NO_CHANGE_LLM_JUDGEMENT"] = "edit_no_change_llm_judgement";
    // Glob-specific Errors
    ToolErrorType["GLOB_EXECUTION_ERROR"] = "glob_execution_error";
    // Grep-specific Errors
    ToolErrorType["GREP_EXECUTION_ERROR"] = "grep_execution_error";
    // Ls-specific Errors
    ToolErrorType["LS_EXECUTION_ERROR"] = "ls_execution_error";
    ToolErrorType["PATH_IS_NOT_A_DIRECTORY"] = "path_is_not_a_directory";
    // MCP-specific Errors
    ToolErrorType["MCP_TOOL_ERROR"] = "mcp_tool_error";
    // Memory-specific Errors
    ToolErrorType["MEMORY_TOOL_EXECUTION_ERROR"] = "memory_tool_execution_error";
    // Shell errors
    ToolErrorType["SHELL_EXECUTE_ERROR"] = "shell_execute_error";
    // DiscoveredTool-specific Errors
    ToolErrorType["DISCOVERED_TOOL_EXECUTION_ERROR"] = "discovered_tool_execution_error";
    // WebFetch-specific Errors
    ToolErrorType["WEB_FETCH_NO_URL_IN_PROMPT"] = "web_fetch_no_url_in_prompt";
    ToolErrorType["WEB_FETCH_FALLBACK_FAILED"] = "web_fetch_fallback_failed";
    ToolErrorType["WEB_FETCH_PROCESSING_ERROR"] = "web_fetch_processing_error";
    // WebSearch-specific Errors
    ToolErrorType["WEB_SEARCH_FAILED"] = "web_search_failed";
    // Truncation Errors
    ToolErrorType["OUTPUT_TRUNCATED"] = "output_truncated";
})(ToolErrorType || (ToolErrorType = {}));
//# sourceMappingURL=tool-error.js.map