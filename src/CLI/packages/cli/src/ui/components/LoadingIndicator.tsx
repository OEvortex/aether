/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ThoughtSummary } from '@aetherai/aether-core';
import { Box, Text } from 'ink';
import type React from 'react';
import { t } from '../../i18n/index.js';
import { useStreamingContext } from '../contexts/StreamingContext.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { theme } from '../semantic-colors.js';
import { StreamingState } from '../types.js';
import { formatDuration, formatTokenCount } from '../utils/formatters.js';
import { isNarrowWidth } from '../utils/isNarrowWidth.js';
import { GeminiRespondingSpinner } from './GeminiRespondingSpinner.js';

interface LoadingIndicatorProps {
    currentLoadingPhrase?: string;
    elapsedTime: number;
    rightContent?: React.ReactNode;
    thought?: ThoughtSummary | null;
    candidatesTokens?: number;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
    currentLoadingPhrase,
    elapsedTime,
    rightContent,
    thought,
    candidatesTokens
}) => {
    const streamingState = useStreamingContext();
    const { columns: terminalWidth } = useTerminalSize();
    const isNarrow = isNarrowWidth(terminalWidth);

    if (streamingState === StreamingState.Idle) {
        return null;
    }

    const primaryText = thought?.subject || currentLoadingPhrase;

    const outputTokens = candidatesTokens ?? 0;
    const showTokens = !isNarrow && outputTokens > 0;

    const timeStr =
        elapsedTime < 60
            ? `${elapsedTime}s`
            : formatDuration(elapsedTime * 1000);

    const tokenStr = showTokens
        ? ` · ↓ ${formatTokenCount(outputTokens)} tokens`
        : '';

    const cancelAndTimerContent =
        streamingState !== StreamingState.WaitingForConfirmation
            ? t('({{time}}{{tokens}} · esc to cancel)', {
                  time: timeStr,
                  tokens: tokenStr
              })
            : null;

    return (
        <Box paddingLeft={2} flexDirection="column">
            {/* Main loading line */}
            <Box
                width="100%"
                flexDirection={isNarrow ? 'column' : 'row'}
                alignItems={isNarrow ? 'flex-start' : 'center'}
            >
                <Box>
                    <Box marginRight={1}>
                        <GeminiRespondingSpinner
                            nonRespondingDisplay={
                                streamingState ===
                                StreamingState.WaitingForConfirmation
                                    ? '⠏'
                                    : ''
                            }
                        />
                    </Box>
                    {primaryText && (
                        <Text color={theme.text.accent} wrap="truncate-end">
                            {primaryText}
                        </Text>
                    )}
                    {!isNarrow && cancelAndTimerContent && (
                        <Text color={theme.text.secondary}>
                            {' '}
                            {cancelAndTimerContent}
                        </Text>
                    )}
                </Box>
                {!isNarrow && <Box flexGrow={1}>{/* Spacer */}</Box>}
                {!isNarrow && rightContent && <Box>{rightContent}</Box>}
            </Box>
            {isNarrow && cancelAndTimerContent && (
                <Box>
                    <Text color={theme.text.secondary}>
                        {cancelAndTimerContent}
                    </Text>
                </Box>
            )}
            {isNarrow && rightContent && <Box>{rightContent}</Box>}
        </Box>
    );
};
