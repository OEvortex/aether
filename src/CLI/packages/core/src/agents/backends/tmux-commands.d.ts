/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Information about a tmux pane, parsed from `list-panes`.
 */
export interface TmuxPaneInfo {
    /** Pane ID (e.g., '%0', '%1') */
    paneId: string;
    /** Whether the pane's process has exited */
    dead: boolean;
    /** Exit status of the pane's process (only valid when dead=true) */
    deadStatus: number;
}
/**
 * Information about a tmux window.
 */
export interface TmuxWindowInfo {
    /** Window name */
    name: string;
    /** Window ID (e.g., '@1') */
    id: string;
}
/**
 * Check if tmux is available on the system.
 */
export declare function isTmuxAvailable(): boolean;
/**
 * Get tmux version string (e.g., "tmux 3.4").
 */
export declare function tmuxVersion(): Promise<string>;
/**
 * Verify tmux is available and meets minimum version requirement.
 *
 * @throws Error if tmux is not available or version is too old.
 */
export declare function verifyTmux(): Promise<void>;
/**
 * Get the current tmux session name (when running inside tmux).
 */
export declare function tmuxCurrentSession(): Promise<string>;
/**
 * Get the current tmux pane ID (when running inside tmux).
 */
export declare function tmuxCurrentPaneId(): Promise<string>;
/**
 * Get the current tmux window target (session:window_index).
 */
export declare function tmuxCurrentWindowTarget(): Promise<string>;
/**
 * Check if a tmux session exists.
 */
export declare function tmuxHasSession(name: string, serverName?: string): Promise<boolean>;
/**
 * List windows in a session.
 */
export declare function tmuxListWindows(sessionName: string, serverName?: string): Promise<TmuxWindowInfo[]>;
/**
 * Check if a tmux window exists within a session.
 */
export declare function tmuxHasWindow(sessionName: string, windowName: string, serverName?: string): Promise<boolean>;
/**
 * Create a new detached tmux session.
 */
export declare function tmuxNewSession(name: string, opts?: {
    cols?: number;
    rows?: number;
    windowName?: string;
}, serverName?: string): Promise<void>;
/**
 * Create a new window in an existing session.
 */
export declare function tmuxNewWindow(targetSession: string, windowName: string, serverName?: string): Promise<void>;
/**
 * Split a window/pane and return the new pane ID.
 *
 * @param target - Target pane/window (e.g., session:window or pane ID)
 * @param opts.horizontal - Split horizontally (left/right) if true, vertically (top/bottom) if false
 * @param opts.percent - Size of the new pane as a percentage (e.g., 70 for 70%)
 * @param opts.command - Shell command to execute directly in the new pane.
 *   When provided, the command becomes the pane's process (not a shell),
 *   so `#{pane_dead}` is set when the command exits.
 * @returns The pane ID of the newly created pane (e.g., '%5')
 */
export declare function tmuxSplitWindow(target: string, opts?: {
    horizontal?: boolean;
    percent?: number;
    command?: string;
}, serverName?: string): Promise<string>;
/**
 * Send keys to a tmux pane.
 *
 * @param paneId - Target pane ID
 * @param keys - Keys to send
 * @param opts.literal - If true, use -l flag (send keys literally, don't interpret)
 */
export declare function tmuxSendKeys(paneId: string, keys: string, opts?: {
    literal?: boolean;
    enter?: boolean;
}, serverName?: string): Promise<void>;
/**
 * Select (focus) a tmux pane.
 */
export declare function tmuxSelectPane(paneId: string, serverName?: string): Promise<void>;
/**
 * Set a pane title.
 */
export declare function tmuxSelectPaneTitle(paneId: string, title: string, serverName?: string): Promise<void>;
/**
 * Set a pane border style via select-pane -P.
 */
export declare function tmuxSelectPaneStyle(paneId: string, style: string, serverName?: string): Promise<void>;
/**
 * Set the layout for a target window.
 *
 * @param target - Target window (e.g., session:window)
 * @param layout - Layout name: 'tiled', 'even-horizontal', 'even-vertical', etc.
 */
export declare function tmuxSelectLayout(target: string, layout: string, serverName?: string): Promise<void>;
/**
 * Capture the content of a pane (including ANSI escape codes).
 *
 * @returns The captured pane content as a string.
 */
export declare function tmuxCapturePaneContent(paneId: string, serverName?: string): Promise<string>;
/**
 * List panes in a target window/session and return parsed info.
 *
 * @param target - Target window (e.g., session:window)
 * @returns Array of pane information.
 */
export declare function tmuxListPanes(target: string, serverName?: string): Promise<TmuxPaneInfo[]>;
/**
 * Parse the output of `tmux list-panes -F '#{pane_id} #{pane_dead} #{pane_dead_status}'`.
 */
export declare function parseTmuxListPanes(output: string): TmuxPaneInfo[];
/**
 * Set a tmux option on a target pane/window.
 */
export declare function tmuxSetOption(target: string, option: string, value: string, serverName?: string): Promise<void>;
/**
 * Respawn a pane with a new command.
 *
 * Kills the current process in the pane and starts a new one.
 * The command becomes the pane's direct process, so `#{pane_dead}`
 * is set when the command exits.
 *
 * @param paneId - Target pane ID
 * @param command - Shell command to execute
 */
export declare function tmuxRespawnPane(paneId: string, command: string, serverName?: string): Promise<void>;
/**
 * Break a pane into a target session (detaches from current window).
 */
export declare function tmuxBreakPane(paneId: string, targetSession: string, serverName?: string): Promise<void>;
/**
 * Join a pane into a target window.
 */
export declare function tmuxJoinPane(paneId: string, target: string, serverName?: string): Promise<void>;
/**
 * Kill a tmux pane.
 */
export declare function tmuxKillPane(paneId: string, serverName?: string): Promise<void>;
/**
 * Resize a tmux pane.
 *
 * @param paneId - Target pane ID
 * @param opts.height - Height (number for lines, or string like '50%')
 * @param opts.width - Width (number for columns, or string like '50%')
 */
export declare function tmuxResizePane(paneId: string, opts: {
    height?: number | string;
    width?: number | string;
}, serverName?: string): Promise<void>;
/**
 * Kill a tmux session.
 */
export declare function tmuxKillSession(name: string, serverName?: string): Promise<void>;
/**
 * Kill a tmux window.
 */
export declare function tmuxKillWindow(target: string, serverName?: string): Promise<void>;
/**
 * Get the first pane ID of a target window.
 */
export declare function tmuxGetFirstPaneId(target: string, serverName?: string): Promise<string>;
