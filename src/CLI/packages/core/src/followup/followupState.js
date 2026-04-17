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
/** Initial empty state */
export const INITIAL_FOLLOWUP_STATE = Object.freeze({
    suggestion: null,
    isVisible: false,
    shownAt: 0
});
// ---------------------------------------------------------------------------
// Framework-agnostic controller
// ---------------------------------------------------------------------------
/** Delay before showing suggestion after response completes */
const SUGGESTION_DELAY_MS = 300;
/** Debounce lock duration to prevent rapid-fire accepts */
const ACCEPT_DEBOUNCE_MS = 100;
/**
 * Creates a framework-agnostic followup suggestion controller.
 *
 * Encapsulates timer management, accept debounce, and state transitions so
 * that React hooks (CLI and WebUI) only need thin wrappers around
 * `useState` + this controller.
 */
export function createFollowupController(options) {
    const { enabled = true, onStateChange, getOnAccept, onOutcome } = options;
    let currentState = INITIAL_FOLLOWUP_STATE;
    let timeoutId = null;
    let accepting = false;
    let acceptTimeoutId = null;
    function applyState(next) {
        currentState = next;
        onStateChange(next);
    }
    function clearTimers() {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        if (acceptTimeoutId) {
            clearTimeout(acceptTimeoutId);
            acceptTimeoutId = null;
        }
    }
    const setSuggestion = (text) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        if (!text) {
            applyState(INITIAL_FOLLOWUP_STATE);
            return;
        }
        // Only schedule new suggestions when enabled
        if (!enabled) {
            return;
        }
        timeoutId = setTimeout(() => {
            applyState({
                suggestion: text,
                isVisible: true,
                shownAt: Date.now()
            });
        }, SUGGESTION_DELAY_MS);
    };
    const accept = (method) => {
        if (accepting) {
            return;
        }
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        accepting = true;
        const text = currentState.suggestion;
        const { shownAt } = currentState;
        if (!text) {
            accepting = false;
            return;
        }
        try {
            onOutcome?.({
                outcome: 'accepted',
                accept_method: method,
                time_ms: shownAt > 0 ? Date.now() - shownAt : 0,
                suggestion_length: text.length
            });
        }
        catch (e) {
            // eslint-disable-next-line no-console
            console.error('[followup] onOutcome callback threw:', e);
        }
        applyState(INITIAL_FOLLOWUP_STATE);
        queueMicrotask(() => {
            try {
                getOnAccept?.()?.(text);
            }
            catch (error) {
                // eslint-disable-next-line no-console
                console.error('[followup] onAccept callback threw:', error);
            }
            finally {
                if (acceptTimeoutId) {
                    clearTimeout(acceptTimeoutId);
                }
                acceptTimeoutId = setTimeout(() => {
                    accepting = false;
                }, ACCEPT_DEBOUNCE_MS);
            }
        });
    };
    const dismiss = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        // Skip if already cleared (e.g., accept already ran)
        if (!currentState.isVisible && !currentState.suggestion) {
            return;
        }
        // Log ignored outcome if a suggestion was visible
        if (currentState.isVisible && currentState.suggestion) {
            try {
                onOutcome?.({
                    outcome: 'ignored',
                    time_ms: currentState.shownAt > 0
                        ? Date.now() - currentState.shownAt
                        : 0,
                    suggestion_length: currentState.suggestion.length
                });
            }
            catch (e) {
                // eslint-disable-next-line no-console
                console.error('[followup] onOutcome callback threw:', e);
            }
        }
        applyState(INITIAL_FOLLOWUP_STATE);
    };
    const clear = () => {
        clearTimers();
        accepting = false;
        applyState(INITIAL_FOLLOWUP_STATE);
    };
    const cleanup = () => {
        clearTimers();
        accepting = false;
    };
    return { setSuggestion, accept, dismiss, clear, cleanup };
}
//# sourceMappingURL=followupState.js.map