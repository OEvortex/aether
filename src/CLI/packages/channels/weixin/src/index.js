import { WeixinChannel } from './WeixinAdapter.js';
export { WeixinChannel } from './WeixinAdapter.js';
export const plugin = {
    channelType: 'weixin',
    displayName: 'WeChat',
    createChannel: (name, config, bridge, options) => new WeixinChannel(name, config, bridge, options)
};
//# sourceMappingURL=index.js.map