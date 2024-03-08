"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchEventData = void 0;
const sse_1 = require("./sse");
const sse = new sse_1.SSEDecoder();
async function fetchEventData(url, options = {}) {
    var _a;
    const { method, data, headers = {}, signal, onMessage, onError, onOpen, onClose } = options;
    Object.assign(headers, {
        Accept: 'text/event-stream',
        'Content-type': 'application/json',
    });
    try {
        const res = await fetch(url, {
            method,
            headers,
            body: JSON.stringify(data),
            signal: signal
        });
        const reader = (_a = res.body) === null || _a === void 0 ? void 0 : _a.getReader();
        onOpen === null || onOpen === void 0 ? void 0 : onOpen();
        onClose === null || onClose === void 0 ? void 0 : onClose();
        while (true) {
            if (!reader)
                break;
            const { value, done } = await reader.read();
            const decoded = sse.decode(value);
            onMessage === null || onMessage === void 0 ? void 0 : onMessage(decoded, done);
            if (done)
                break;
        }
    }
    catch (err) {
        onError === null || onError === void 0 ? void 0 : onError(err);
    }
}
exports.fetchEventData = fetchEventData;
