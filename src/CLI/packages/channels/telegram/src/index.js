import { TelegramChannel } from './TelegramAdapter.js';
export { TelegramChannel } from './TelegramAdapter.js';
export const plugin = {
    channelType: 'telegram',
    displayName: 'Telegram',
    requiredConfigFields: ['token'],
    createChannel: (name, config, bridge, options) => new TelegramChannel(name, config, bridge, options)
};
//# sourceMappingURL=index.js.map