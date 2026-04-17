/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { t } from '../../i18n/index.js';
import type { OpenDialogActionReturn, SlashCommand } from './types.js';
import { CommandKind } from './types.js';

export const providerCommand: SlashCommand = {
    name: 'provider',
    get description() {
        return t('Choose the active provider');
    },
    kind: CommandKind.BUILT_IN,
    action: (): OpenDialogActionReturn => ({
        type: 'dialog',
        dialog: 'auth'
    })
};
