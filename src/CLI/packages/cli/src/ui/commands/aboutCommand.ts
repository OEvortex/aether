/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { t } from '../../i18n/index.js';
import { getExtendedSystemInfo } from '../../utils/systemInfo.js';
import { type HistoryItemAbout, MessageType } from '../types.js';
import type { SlashCommand } from './types.js';
import { CommandKind } from './types.js';

export const aboutCommand: SlashCommand = {
    name: 'status',
    altNames: ['about'],
    get description() {
        return t('show version info');
    },
    kind: CommandKind.BUILT_IN,
    action: async (context) => {
        const systemInfo = await getExtendedSystemInfo(context);

        const aboutItem: Omit<HistoryItemAbout, 'id'> = {
            type: MessageType.ABOUT,
            systemInfo
        };

        context.ui.addItem(aboutItem, Date.now());

        return undefined;
    }
};
