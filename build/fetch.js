"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchEventData = void 0;
const sse_1 = require("./sse");
const sse = new sse_1.SSEDecoder();
function fetchEventData(url_1) {
    return __awaiter(this, arguments, void 0, function* (url, options = {}) {
        var _a;
        const { method, data, headers = {}, signal, onMessage, onError, onOpen, onClose } = options;
        Object.assign(headers, {
            Accept: 'text/event-stream',
            'Content-type': 'application/json',
        });
        try {
            const res = yield fetch(url, {
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
                const { value, done } = yield reader.read();
                const decoded = sse.decode(value);
                onMessage === null || onMessage === void 0 ? void 0 : onMessage(decoded, done);
                if (done)
                    break;
            }
        }
        catch (err) {
            onError === null || onError === void 0 ? void 0 : onError(err);
        }
    });
}
exports.fetchEventData = fetchEventData;
