import { Bytes, ServerSentEvent, LinesResult } from './interface';

export const NewLineChars = {
  NewLine: 10,
  CarriageReturn: 13,
  Space: 32,
  Colon: 58
};

export async function parseServerSentEvent(stream: ReadableStream<Uint8Array>, onMessage: (event: ServerSentEvent) => void) {
  const lineDecoder = new LineDecoder();
  const messageDecoder = new MessageDecoder();

  await getBytes(stream, (chunk: Uint8Array) => {
    // get string lines, newline-separated should be \n,\r,\r\n
    const list = lineDecoder.getLines(chunk);
    for (const data of list) {
      const source = messageDecoder.decode(data.line, data.fieldLength);
      if (source) onMessage(source);
    }
  });
}

/**
 * Converts a ReadableStream into a callback pattern.
 */
async function getBytes(stream: ReadableStream<Uint8Array>, onChunk: (arr: Uint8Array) => void) {
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(value);
  }
}

/**
 * decode string lines to ServerSentEvent
 */
export class MessageDecoder {
  private data: string[];
  private event: string | null;
  private chunks: string[];

  constructor() {
    this.event = null;
    this.data = [];
    this.chunks = [];
  }

  public decode(line: Uint8Array, filedLength: number) {
    if (line.length === 0) {
      // Ignore control-only blocks. SSE only dispatches when at least one data field was seen.
      if (this.data.length === 0) {
        this.reset();
        return;
      }

      const sse: ServerSentEvent = {
        event: this.event,
        data: this.data.join('\n'),
        raw: this.chunks,
      };

      this.reset();

      return sse;
    }

    if (filedLength === 0) {
      return;
    }

    const { field, value } = this.parseField(line, filedLength);
    this.chunks.push(value);
    switch (field) {
    case 'event':
      this.event = value || null;
      break;
    case 'data':
      this.data.push(value);
      break;
    default:
      break;
    }
  }

  private parseField(line: Uint8Array, filedLength: number) {
    if (filedLength === -1) {
      return {
        field: this.decodeText(line),
        value: ''
      };
    }

    const field = this.decodeText(line.subarray(0, filedLength));
    const valueOffset = filedLength + (line[filedLength + 1] === NewLineChars.Space ? 2 : 1);

    return {
      field,
      value: this.decodeText(line.subarray(valueOffset))
    };
  }

  private reset() {
    this.event = null;
    this.data = [];
    this.chunks = [];
  }

  private decodeText(bytes: Bytes): string {
    // Node:
    if (typeof Buffer !== 'undefined') {
      if (bytes instanceof Buffer) {
        return bytes.toString('utf-8');
      }
      if (bytes instanceof Uint8Array) {
        return Buffer.from(bytes).toString('utf-8');
      }

      throw new Error(
        `Unexpected: received non-Uint8Array (${bytes.constructor.name}) stream chunk in an environment with a global "Buffer" defined, which this library assumes to be Node. Please report this error.`,
      );
    }

    // Browser
    if (typeof TextDecoder !== 'undefined') {
      if (bytes instanceof Uint8Array || bytes instanceof ArrayBuffer) {
        const decoder = new TextDecoder('utf8');
        return decoder.decode(bytes);
      }

      throw new Error(
        `Unexpected: received non-Uint8Array/ArrayBuffer (${
          (bytes as any).constructor.name
        }) in a web platform. Please report this error.`,
      );
    }

    throw new Error(
      'Unexpected: neither Buffer nor TextDecoder are available as globals. Please report this error.',
    );
  }
}

/**
 * Parses any byte chunks into EventSource line buffers.
 */
export class LineDecoder {
  private buffer: Uint8Array | undefined;
  private position: number;
  private fieldLength: number;
  private trailingNewLine: boolean;
  private bomProcessed: boolean;

  constructor() {
    this.position = 0;
    this.fieldLength = -1;
    this.buffer = undefined;
    this.trailingNewLine = false;
    this.bomProcessed = false;
  }

  getLines(chunk: Uint8Array): LinesResult[] {
    if (this.buffer === undefined) {
      this.buffer = chunk;
      this.position = 0;
      this.fieldLength = -1;
    } else {
      const buffer = new Uint8Array(this.buffer.length + chunk.length);
      buffer.set(this.buffer);
      buffer.set(chunk, this.buffer.length);
      this.buffer = buffer;
    }

    if (!this.processBom()) {
      return [];
    }

    const { buffer } = this;

    const bufLength = this.buffer.length;
    let lineStart = 0;
    let resultBuf: Uint8Array = new Uint8Array();
    let resultFieldLength = -1;
    const list: LinesResult[] = [];
    while (this.position < bufLength) {
      // check new line char, if checked, skip to next char
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
    } else if (lineStart !== 0) {
      this.buffer = this.buffer.subarray(lineStart);
      this.position -= lineStart;
    }

    
    return list;
  }

  private processBom() {
    if (this.bomProcessed) {
      return true;
    }

    if (this.buffer === undefined || this.buffer.length === 0) {
      this.bomProcessed = true;
      return true;
    }

    const [first, second, third] = this.buffer;
    if (first !== 0xEF) {
      this.bomProcessed = true;
      return true;
    }

    if (this.buffer.length === 1) {
      return false;
    }

    if (second !== 0xBB) {
      this.bomProcessed = true;
      return true;
    }

    if (this.buffer.length === 2) {
      return false;
    }

    if (third === 0xBF) {
      this.buffer = this.buffer.subarray(3);
    }

    this.bomProcessed = true;
    return true;
  }
}
