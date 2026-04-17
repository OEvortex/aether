/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApprovalMode } from '@aetherai/aether-core';
import { Box, Text } from 'ink';
import type React from 'react';
import { t } from '../../i18n/index.js';
import { theme } from '../semantic-colors.js';

interface AutoAcceptIndicatorProps {
    approvalMode: ApprovalMode;
}

export const AutoAcceptIndicator: React.FC<AutoAcceptIndicatorProps> = ({
    approvalMode
}) => {
    let textColor = '';
    let textContent = '';
    let subText = '';

    const cycleText =
        process.platform === 'win32'
            ? ` ${t('(tab to cycle)')}`
            : ` ${t('(shift + tab to cycle)')}`;

    switch (approvalMode) {
        case ApprovalMode.PLAN:
            textColor = theme.status.success;
            textContent = t('plan mode');
            subText = cycleText;
            break;
        case ApprovalMode.AUTO_EDIT:
            textColor = theme.status.warning;
            textContent = t('auto-accept edits');
            subText = cycleText;
            break;
        case ApprovalMode.YOLO:
            textColor = theme.status.error;
            textContent = t('YOLO mode');
            subText = cycleText;
            break;
        default:
            break;
    }

    return (
        <Box>
            <Text color={textColor}>
                {textContent}
                {subText && <Text color={theme.text.secondary}>{subText}</Text>}
            </Text>
        </Box>
    );
};
