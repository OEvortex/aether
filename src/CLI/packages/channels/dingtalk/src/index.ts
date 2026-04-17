import type { ChannelPlugin as ChannelPluginBase } from '../../base/src/index.js';
import { DingtalkChannel } from './DingtalkAdapter.js';

export { DingtalkChannel } from './DingtalkAdapter.js';
export { downloadMedia } from './media.js';

export const plugin: ChannelPluginBase = {
    channelType: 'dingtalk',
    displayName: 'DingTalk',
    requiredConfigFields: ['clientId', 'clientSecret'],
    createChannel: (name, config, bridge, options) =>
        new DingtalkChannel(name, config, bridge, options)
};
