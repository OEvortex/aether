/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PlanResultDisplay } from '@aetherai/aether-core';
import { Box, Text } from 'ink';
import type React from 'react';
import { Colors } from '../colors.js';
import { MarkdownDisplay } from '../utils/MarkdownDisplay.js';

interface PlanSummaryDisplayProps {
    data: PlanResultDisplay;
    availableHeight?: number;
    childWidth: number;
}

export const PlanSummaryDisplay: React.FC<PlanSummaryDisplayProps> = ({
    data,
    availableHeight,
    childWidth
}) => {
    const { message, plan, rejected } = data;
    const messageColor = rejected ? Colors.AccentYellow : Colors.AccentGreen;

    return (
        <Box flexDirection="column">
            <Box marginBottom={1}>
                <Text color={messageColor} wrap="wrap">
                    {message}
                </Text>
            </Box>
            <MarkdownDisplay
                text={plan}
                isPending={false}
                availableTerminalHeight={availableHeight}
                contentWidth={childWidth}
            />
        </Box>
    );
};
