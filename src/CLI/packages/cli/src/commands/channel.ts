import type { Argv, CommandModule } from 'yargs';
import { configureWeixinCommand } from './channel/configure.js';
import {
    pairingApproveCommand,
    pairingListCommand
} from './channel/pairing.js';
import { startCommand } from './channel/start.js';
import { statusCommand } from './channel/status.js';
import { stopCommand } from './channel/stop.js';

const pairingCommand: CommandModule = {
    command: 'pairing',
    describe: 'Manage DM pairing requests',
    builder: (yargs: Argv) =>
        yargs
            .command(pairingListCommand)
            .command(pairingApproveCommand)
            .demandCommand(
                1,
                'You need at least one command before continuing.'
            )
            .version(false),
    handler: () => {}
};

export const channelCommand: CommandModule = {
    command: 'channel',
    describe: 'Manage messaging channels (Telegram, Discord, etc.)',
    builder: (yargs: Argv) =>
        yargs
            .command(startCommand)
            .command(stopCommand)
            .command(statusCommand)
            .command(pairingCommand)
            .command(configureWeixinCommand)
            .demandCommand(
                1,
                'You need at least one command before continuing.'
            )
            .version(false),
    handler: () => {}
};
