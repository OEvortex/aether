/**
 * @license
 * Copyright 2025 Qwen Team
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared Follow-up Suggestions State Logic
 *
 * Framework-agnostic state management for prompt suggestions,
 * shared between CLI (Ink) and WebUI (React) hooks.
 */
/**
 * State for prompt suggestion display.
 */
export interface FollowupState {
    /** Current suggestion text */
    suggestion: string | null;
    /** Whether to show suggestion */
    isVisible: boolean;
    /** Timestamp when suggestion was shown (for telemetry) */
    shownAt: number;
}
/** Initial empty state */
export declare const INITIAL_FOLLOWUP_STATE: Readonly<FollowupState>;
/**
 * Options for creating a followup controller
 */
export interface FollowupControllerOptions {
    /** Whether the feature is enabled (checked when setting suggestion) */
    enabled?: boolean;
    /** Called whenever the internal state changes */
    onStateChange: (state: FollowupState) => void;
    /**
     * Returns the current onAccept callback.
     * A getter is used so the controller always invokes the latest callback
     * without requiring re-creation when the callback reference changes.
     */
    getOnAccept?: () => ((text: string) => void) | undefined;
    /**
     * Called when a suggestion outcome is determined (accepted or ignored).
     * Used for telemetry. Note: 'suppressed' outcomes are logged separately
     * at the generation site, not through this callback.
     */
    onOutcome?: (params: {
        outcome: 'accepted' | 'ignored';
        accept_method?: 'tab' | 'enter' | 'right';
        time_ms: number;
        suggestion_length: number;
    }) => void;
}
/**
 * Actions returned by createFollowupController.
 * These are stable (never change identity) and safe to call from any context.
 */
export interface FollowupControllerActions {
    /** Set suggestion text (with delayed show). Null clears immediately. */
    setSuggestion: (text: string | null) => void;
    /** Accept the current suggestion and invoke onAccept callback */
    accept: (method?: 'tab' | 'enter' | 'right') => void;
    /** Dismiss/clear suggestion */
    dismiss: () => void;
    /** Hard-clear all state and timers */
    clear: () => void;
    /** Clean up timers — call on unmount */
    cleanup: () => void;
}
/**
 * Creates a framework-agnostic followup suggestion controller.
 *
 * Encapsulates timer management, accept debounce, and state transitions so
 * that React hooks (CLI and WebUI) only need thin wrappers around
 * `useState` + this controller.
 */
export declare function createFollowupController(options: FollowupControllerOptions): FollowupControllerActions;
