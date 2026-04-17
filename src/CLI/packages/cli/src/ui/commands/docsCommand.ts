/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import process from 'node:process';
import open from 'open';
import { getCurrentLanguage, t } from '../../i18n/index.js';
import { MessageType } from '../types.js';
import {
    type CommandContext,
    CommandKind,
    type SlashCommand
} from './types.js';

export const docsCommand: SlashCommand = {
    name: 'docs',
    get description() {
        return t('open full Aether Code documentation in your browser');
    },
    kind: CommandKind.BUILT_IN,
    action: async (context: CommandContext): Promise<undefined> => {
        const langPath = getCurrentLanguage()?.startsWith('zh') ? 'zh' : 'en';
        const docsUrl = `https://OEvortex.github.io/aether-docs/${langPath}`;

        if (process.env.SANDBOX && process.env.SANDBOX !== 'sandbox-exec') {
            context.ui.addItem(
                {
                    type: MessageType.INFO,
                    text: t(
                        'Please open the following URL in your browser to view the documentation:\n{{url}}',
                        {
                            url: docsUrl
                        }
                    )
                },
                Date.now()
            );
        } else {
            context.ui.addItem(
                {
                    type: MessageType.INFO,
                    text: t('Opening documentation in your browser: {{url}}', {
                        url: docsUrl
                    })
                },
                Date.now()
            );
            await open(docsUrl);
        }

        return undefined;
    }
};
