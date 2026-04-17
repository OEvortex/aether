/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { t } from '../../i18n/index.js';
import type { OpenDialogActionReturn, SlashCommand } from './types.js';
import { CommandKind } from './types.js';

export const mcpCommand: SlashCommand = {
    name: 'mcp',
    get description() {
        return t('Open MCP management dialog');
    },
    kind: CommandKind.BUILT_IN,
    action: async (): Promise<OpenDialogActionReturn> => ({
        type: 'dialog',
        dialog: 'mcp'
    })
};
