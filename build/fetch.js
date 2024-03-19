"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchEventData = void 0;
const sse_1 = require("./sse");
const utils_1 = require("./utils");
const sse = new sse_1.SSEDecoder();
async function fetchEventData(url, options = {}) {
    const { method, data, headers = {}, signal, onMessage, onError, onOpen, onClose } = options;
    const defaultHeaders = {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json'
    };
    const mergedHeaders = Object.assign(Object.assign({}, defaultHeaders), headers);
    try {
        const res = await fetch(url, {
            method,
            headers: mergedHeaders,
            body: JSON.stringify(data),
            signal: signal
        });
        await (0, utils_1.checkOk)(res);
        onOpen === null || onOpen === void 0 ? void 0 : onOpen(res);
        // consumes data
        if (typeof onMessage === 'function' && res.body) {
            const reader = res.body.getReader();
            while (true) {
                const { value, done } = await reader.read();
                if (done)
                    break;
                const decoded = sse.decode(value);
                for (const event of decoded) {
                    onMessage(event, done);
                }
            }
            onMessage(null, true);
            onClose === null || onClose === void 0 ? void 0 : onClose();
        }
    }
    catch (err) {
        onError === null || onError === void 0 ? void 0 : onError(err);
    }
}
exports.fetchEventData = fetchEventData;
