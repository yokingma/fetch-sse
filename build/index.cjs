"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  fetchEventData: () => fetchEventData
});
module.exports = __toCommonJS(src_exports);

// src/sse.ts
var NewLineChars = {
  NewLine: 10,
  CarriageReturn: 13,
  Space: 32,
  Colon: 58
};
async function parseServerSentEvent(stream, onMessage) {
  const lineDecoder = new LineDecoder();
  await getBytes(stream, (chunk) => {
    const decoder = new MessageDecoder();
    const list = lineDecoder.getLines(chunk);
    for (const data of list) {
      const source = decoder.decode(data.line, data.fieldLength);
      if (source) onMessage(source);
    }
  });
}
async function getBytes(stream, onChunk) {
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(value);
  }
}
var MessageDecoder = class {
  constructor() {
    this.event = null;
    this.data = [];
    this.chunks = [];
  }
  decode(line, filedLength) {
    if (line.length === 0) {
      const sse = {
        event: this.event,
        data: this.data.join("\n"),
        raw: this.chunks
      };
      this.event = null;
      this.data = [];
      this.chunks = [];
      return sse;
    } else if (filedLength > 0) {
      const field = this.decodeText(line.subarray(0, filedLength));
      const valueOffset = filedLength + (line[filedLength + 1] === NewLineChars.Space ? 2 : 1);
      const value = this.decodeText(line.subarray(valueOffset));
      this.chunks.push(value);
      switch (field) {
        case "event":
          this.event = value;
          break;
        case "data":
          this.data.push(value);
          break;
      }
    }
  }
  decodeText(bytes) {
    if (typeof Buffer !== "undefined") {
      if (bytes instanceof Buffer) {
        return bytes.toString("utf-8");
      }
      if (bytes instanceof Uint8Array) {
        return Buffer.from(bytes).toString("utf-8");
      }
      throw new Error(
        `Unexpected: received non-Uint8Array (${bytes.constructor.name}) stream chunk in an environment with a global "Buffer" defined, which this library assumes to be Node. Please report this error.`
      );
    }
    if (typeof TextDecoder !== "undefined") {
      if (bytes instanceof Uint8Array || bytes instanceof ArrayBuffer) {
        const decoder = new TextDecoder("utf8");
        return decoder.decode(bytes);
      }
      throw new Error(
        `Unexpected: received non-Uint8Array/ArrayBuffer (${bytes.constructor.name}) in a web platform. Please report this error.`
      );
    }
    throw new Error(
      "Unexpected: neither Buffer nor TextDecoder are available as globals. Please report this error."
    );
  }
};
var LineDecoder = class {
  constructor() {
    this.position = 0;
    this.fieldLength = -1;
    this.buffer = void 0;
    this.trailingNewLine = false;
  }
  getLines(chunk) {
    if (this.buffer === void 0) {
      this.buffer = chunk;
      this.position = 0;
      this.fieldLength = -1;
    } else {
      const buffer2 = new Uint8Array(this.buffer.length + chunk.length);
      buffer2.set(this.buffer);
      buffer2.set(chunk, this.buffer.length);
      this.buffer = buffer2;
    }
    const { buffer } = this;
    const bufLength = this.buffer.length;
    let lineStart = 0;
    let resultBuf = new Uint8Array();
    let resultFieldLength = -1;
    const list = [];
    while (this.position < bufLength) {
      if (this.trailingNewLine) {
        if (buffer[this.position] === NewLineChars.NewLine) {
          lineStart = ++this.position;
        }
        this.trailingNewLine = false;
      }
      let lineEnd = -1;
      for (; this.position < bufLength && lineEnd === -1; ++this.position) {
        switch (buffer[this.position]) {
          case NewLineChars.Colon:
            if (this.fieldLength === -1) this.fieldLength = this.position - lineStart;
            break;
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - this case ('\r') should fallthrough to NewLine '\n'
          case NewLineChars.CarriageReturn:
            this.trailingNewLine = true;
          // eslint-disable-next-line no-fallthrough
          case NewLineChars.NewLine:
            lineEnd = this.position;
            break;
        }
      }
      if (lineEnd === -1) {
        break;
      }
      resultBuf = this.buffer.subarray(lineStart, lineEnd);
      resultFieldLength = this.fieldLength;
      list.push({ fieldLength: resultFieldLength, line: resultBuf });
      lineStart = this.position;
      this.fieldLength = -1;
    }
    if (lineStart === bufLength) {
      this.buffer = void 0;
    } else if (lineStart !== 0) {
      this.buffer = this.buffer.subarray(lineStart);
      this.position -= lineStart;
    }
    return list;
  }
};

// src/utils.ts
var checkOk = async (response) => {
  if (!response.ok) {
    const defaultMessage = `Error ${response.status}: ${response.statusText}`;
    let message = "";
    if (response.headers.get("content-type")?.includes("application/json")) {
      try {
        const errorData = await response.json();
        message = errorData.message || errorData.error || defaultMessage;
      } catch (error) {
        throw new Error("Failed to parse error response as JSON");
      }
    } else {
      try {
        const textData = await response.text();
        message = textData || defaultMessage;
      } catch (error) {
        throw new Error("Failed to parse error response as text");
      }
    }
    throw new Error(message);
  }
};

// src/fetch.ts
async function fetchEventData(url, options = {}) {
  const { method, data = null, headers = {}, signal, onMessage, onError, onOpen, onClose } = options;
  const defaultHeaders = {
    Accept: "text/event-stream",
    "Content-Type": "application/json"
  };
  const mergedHeaders = {
    ...defaultHeaders,
    ...headers
  };
  let body;
  if (isPlainObject(data)) {
    body = JSON.stringify(data);
  } else {
    body = data;
  }
  try {
    const res = await fetch(url, {
      method,
      headers: mergedHeaders,
      body,
      signal
    });
    await checkOk(res);
    onOpen?.(res);
    if (typeof onMessage === "function" && res.body) {
      await parseServerSentEvent(res.body, (event) => {
        onMessage(event);
      });
      onClose?.();
    }
  } catch (err) {
    onError?.(err);
  }
}
function isPlainObject(obj) {
  if (obj === null || typeof obj !== "object") {
    return false;
  }
  const proto = Object.getPrototypeOf(obj);
  return proto === Object.prototype || proto === null;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  fetchEventData
});
//# sourceMappingURL=index.cjs.map