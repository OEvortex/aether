/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import { t } from '../../i18n/index.js';
import {
    CommandKind,
    type OpenDialogActionReturn,
    type SlashCommand
} from './types.js';

export const agentsCommand: SlashCommand = {
    name: 'agents',
    get description() {
        return t('Manage subagents for specialized task delegation.');
    },
    kind: CommandKind.BUILT_IN,
    subCommands: [
        {
            name: 'manage',
            get description() {
                return t('Manage existing subagents (view, edit, delete).');
            },
            kind: CommandKind.BUILT_IN,
            action: (): OpenDialogActionReturn => ({
                type: 'dialog',
                dialog: 'subagent_list'
            })
        },
        {
            name: 'create',
            get description() {
                return t('Create a new subagent with guided setup.');
            },
            kind: CommandKind.BUILT_IN,
            action: (): OpenDialogActionReturn => ({
                type: 'dialog',
                dialog: 'subagent_create'
            })
        }
    ]
};
