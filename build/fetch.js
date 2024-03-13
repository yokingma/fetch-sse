"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchEventData = void 0;
const sse_1 = require("./sse");
const sse = new sse_1.SSEDecoder();
async function fetchEventData(url, options = {}) {
    var _a;
    const { method, data, headers = {}, signal, onMessage, onError, onOpen, onClose } = options;
    const mergedHeaders = Object.assign({}, headers, {
        Accept: 'text/event-stream'
    });
    try {
        const res = await fetch(url, {
            method,
            headers: mergedHeaders,
            body: JSON.stringify(data),
            signal: signal
        });
        onOpen === null || onOpen === void 0 ? void 0 : onOpen(res);
        // consumes data
        if (typeof onMessage === 'function') {
            const reader = (_a = res.body) === null || _a === void 0 ? void 0 : _a.getReader();
            while (true) {
                if (!reader)
                    break;
                const { value, done } = await reader.read();
                const decoded = sse.decode(value);
                onMessage(decoded, done);
                if (done)
                    break;
            }
            onClose === null || onClose === void 0 ? void 0 : onClose();
        }
    }
    catch (err) {
        onError === null || onError === void 0 ? void 0 : onError(err);
    }
}
exports.fetchEventData = fetchEventData;
