/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { t } from '../../i18n/index.js';
import { type HistoryItemHelp, MessageType } from '../types.js';
import type { SlashCommand } from './types.js';
import { CommandKind } from './types.js';

export const helpCommand: SlashCommand = {
    name: 'help',
    altNames: ['?'],
    kind: CommandKind.BUILT_IN,
    get description() {
        return t('for help on Aether Code');
    },
    action: async (context) => {
        const helpItem: Omit<HistoryItemHelp, 'id'> = {
            type: MessageType.HELP,
            timestamp: new Date()
        };

        context.ui.addItem(helpItem, Date.now());

        return undefined;
    }
};
