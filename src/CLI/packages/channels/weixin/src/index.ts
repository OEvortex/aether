import type { ChannelPlugin } from '../../base/src/index.js';
import { WeixinChannel } from './WeixinAdapter.js';

export { WeixinChannel } from './WeixinAdapter.js';

export const plugin: ChannelPlugin = {
    channelType: 'weixin',
    displayName: 'WeChat',
    createChannel: (name, config, bridge, options) =>
        new WeixinChannel(name, config, bridge, options)
};
