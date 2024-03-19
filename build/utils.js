"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkOk = void 0;
const checkOk = async (response) => {
    var _a;
    if (!response.ok) {
        const defaultMessage = `Error ${response.status}: ${response.statusText}`;
        let message = '';
        if ((_a = response.headers.get('content-type')) === null || _a === void 0 ? void 0 : _a.includes('application/json')) {
            try {
                const errorData = await response.json();
                message = errorData.message || errorData.error || defaultMessage;
            }
            catch (error) {
                throw new Error('Failed to parse error response as JSON');
            }
        }
        else {
            try {
                const textData = await response.text();
                message = textData || defaultMessage;
            }
            catch (error) {
                throw new Error('Failed to parse error response as text');
            }
        }
        throw new Error(message);
    }
};
exports.checkOk = checkOk;
