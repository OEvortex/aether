import { EventEmitter } from 'node:events';
export class AcpBridge extends EventEmitter {
    options;
    started = false;
    constructor(options) {
        super();
        this.options = options;
    }
    async start() {
        this.started = true;
    }
    stop() {
        if (!this.started) {
            return;
        }
        this.started = false;
        this.emit('disconnected');
    }
    sendToolCall(event) {
        this.emit('toolCall', event);
    }
}
//# sourceMappingURL=AcpBridge.js.map