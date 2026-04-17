/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { FatalConfigError, getErrorMessage } from '@aetherai/aether-core';
import type { CommandModule } from 'yargs';
import { SettingScope } from '../../config/settings.js';
import { t } from '../../i18n/index.js';
import { writeStdoutLine } from '../../utils/stdioHelpers.js';
import { getExtensionManager } from './utils.js';

interface EnableArgs {
    name: string;
    scope?: string;
}

export async function handleEnable(args: EnableArgs) {
    const extensionManager = await getExtensionManager();

    const normalizedScope = args.scope
        ? Object.values(SettingScope).find(
              (scope) => scope.toLowerCase() === args.scope?.toLowerCase()
          )
        : undefined;
    const scopesToEnable =
        normalizedScope === undefined
            ? [SettingScope.User, SettingScope.Workspace]
            : [normalizedScope];

    try {
        scopesToEnable.forEach((scope) => {
            extensionManager.enableExtension(args.name, scope);
        });

        const scopeLabel =
            normalizedScope ??
            `${SettingScope.User} and ${SettingScope.Workspace}`;
        writeStdoutLine(
            t(
                'Extension "{{name}}" successfully enabled for scope "{{scope}}".',
                {
                    name: args.name,
                    scope: scopeLabel
                }
            )
        );
    } catch (error) {
        throw new FatalConfigError(getErrorMessage(error));
    }
}

export const enableCommand: CommandModule = {
    command: 'enable [--scope] <name>',
    describe: t('Enables an extension.'),
    builder: (yargs) =>
        yargs
            .positional('name', {
                describe: t('The name of the extension to enable.'),
                type: 'string'
            })
            .option('scope', {
                describe: t(
                    'The scope to enable the extension in. If not set, will be enabled in all scopes.'
                ),
                type: 'string'
            })
            .check((argv) => {
                if (
                    argv.scope &&
                    !Object.values(SettingScope)
                        .map((s) => s.toLowerCase())
                        .includes((argv.scope as string).toLowerCase())
                ) {
                    throw new Error(
                        t(
                            'Invalid scope: {{scope}}. Please use one of {{scopes}}.',
                            {
                                scope: argv.scope as string,
                                scopes: Object.values(SettingScope)
                                    .map((s) => s.toLowerCase())
                                    .join(', ')
                            }
                        )
                    );
                }
                return true;
            }),
    handler: async (argv) => {
        await handleEnable({
            name: argv.name as string,
            scope: argv.scope as string
        });
    }
};
