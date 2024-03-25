"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSEDecoder = exports.LineDecoder = exports.parseServerSentEvent = exports.NewLineChars = void 0;
exports.NewLineChars = {
    NewLine: 10,
    CarriageReturn: 13,
    Space: 12,
    Colon: 58
};
async function parseServerSentEvent(stream, onMessage) {
    const decoder = new SSEDecoder();
    await getBytes(stream, (chunk) => {
        const lineDecoder = new LineDecoder();
        // get string lines, newline-separated should be \n,\r,\r\n
        const list = lineDecoder.getLines(chunk);
        for (const data of list) {
            const source = decoder.decode(data.line, data.fieldLength);
            if (source)
                onMessage(source);
        }
    });
}
exports.parseServerSentEvent = parseServerSentEvent;
/**
 * Converts a ReadableStream into a callback pattern.
 */
async function getBytes(stream, onChunk) {
    const reader = stream.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        onChunk(value);
    }
}
/**
 * Parses any byte chunks into EventSource line buffers.
 */
class LineDecoder {
    constructor() {
        this.position = 0;
        this.fieldLength = -1;
        this.buffer = undefined;
        this.trailingNewLine = false;
    }
    getLines(chunk) {
        if (this.buffer === undefined) {
            this.buffer = chunk;
            this.position = 0;
            this.fieldLength = -1;
        }
        else {
            const buffer = new Uint8Array(this.buffer.length + chunk.length);
            buffer.set(this.buffer);
            buffer.set(chunk, this.buffer.length);
            this.buffer = buffer;
        }
        const { buffer } = this;
        const bufLength = this.buffer.length;
        let lineStart = 0;
        let resultBuf = new Uint8Array();
        let resultFieldLength = -1;
        const list = [];
        while (this.position < bufLength) {
            // check new line char, if checked, skip to next char
            if (this.trailingNewLine) {
                if (buffer[this.position] === exports.NewLineChars.NewLine) {
                    lineStart = ++this.position;
                }
                this.trailingNewLine = false;
            }
            let lineEnd = -1;
            for (; this.position < bufLength && lineEnd === -1; ++this.position) {
                switch (buffer[this.position]) {
                    case exports.NewLineChars.Colon:
                        if (this.fieldLength === -1)
                            this.fieldLength = this.position - lineStart;
                        break;
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore - this case ('\r') should fallthrough to NewLine '\n'
                    case exports.NewLineChars.CarriageReturn:
                        this.trailingNewLine = true;
                    // eslint-disable-next-line no-fallthrough
                    case exports.NewLineChars.NewLine:
                        lineEnd = this.position;
                        break;
                }
            }
            if (lineEnd === -1) {
                // the line has not ended, so we need to the next line and continue parsing.
                break;
            }
            // got the data
            resultBuf = this.buffer.subarray(lineStart, lineEnd);
            resultFieldLength = this.fieldLength;
            list.push({ fieldLength: resultFieldLength, line: resultBuf });
            lineStart = this.position;
            this.fieldLength = -1;
        }
        if (lineStart === bufLength) {
            this.buffer = undefined;
        }
        else if (lineStart !== 0) {
            this.buffer = this.buffer.subarray(lineStart);
            this.position -= lineStart;
        }
        return list;
    }
}
exports.LineDecoder = LineDecoder;
/**
 * decode string lines to ServerSentEvent
 */
class SSEDecoder {
    constructor() {
        this.event = null;
        this.data = [];
        this.chunks = [];
    }
    decode(line, filedLength) {
        if (line.length === 0) {
            // empty line denotes end of message. return event data and start a new message:
            const sse = {
                event: this.event,
                data: this.data.join('\n'),
                raw: this.chunks,
            };
            // new message
            this.event = null;
            this.data = [];
            this.chunks = [];
            return sse;
        }
        else if (filedLength > 0) {
            // line is of format "<field>:<value>" or "<field>: <value>"
            const field = this.decodeText(line.subarray(0, filedLength));
            const valueOffset = filedLength + (line[filedLength + 1] === exports.NewLineChars.Space ? 2 : 1);
            const value = this.decodeText(line.subarray(valueOffset));
            switch (field) {
                case 'event':
                    this.event = value;
                    break;
                case 'data':
                    this.data.push(value);
                    break;
            }
        }
    }
    decodeText(bytes) {
        // Node:
        if (typeof Buffer !== 'undefined') {
            if (bytes instanceof Buffer) {
                return bytes.toString('utf-8');
            }
            if (bytes instanceof Uint8Array) {
                return Buffer.from(bytes).toString('utf-8');
            }
            throw new Error(`Unexpected: received non-Uint8Array (${bytes.constructor.name}) stream chunk in an environment with a global "Buffer" defined, which this library assumes to be Node. Please report this error.`);
        }
        // Browser
        if (typeof TextDecoder !== 'undefined') {
            if (bytes instanceof Uint8Array || bytes instanceof ArrayBuffer) {
                const decoder = new TextDecoder('utf8');
                return decoder.decode(bytes);
            }
            throw new Error(`Unexpected: received non-Uint8Array/ArrayBuffer (${bytes.constructor.name}) in a web platform. Please report this error.`);
        }
        throw new Error('Unexpected: neither Buffer nor TextDecoder are available as globals. Please report this error.');
    }
}
exports.SSEDecoder = SSEDecoder;
