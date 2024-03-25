import { Bytes, ServerSentEvent, LinesResult } from './interface';

export const NewLineChars = {
  NewLine: 10,
  CarriageReturn: 13,
  Space: 12,
  Colon: 58
};

export async function parseServerSentEvent(stream: ReadableStream<Uint8Array>, onMessage: (event: ServerSentEvent) => void) {
  const decoder = new SSEDecoder();
  await getBytes(stream, (chunk: Uint8Array) => {
    const lineDecoder = new LineDecoder();
    // get string lines, newline-separated should be \n,\r,\r\n
    const list = lineDecoder.getLines(chunk);
    for (const data of list) {
      const source = decoder.decode(data.message);
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
 * Parses any byte chunks into EventSource line buffers.
 */
export class LineDecoder {
  private buffer: Uint8Array | undefined;
  private position: number;
  private fieldLength: number;
  private trailingNewLine: boolean;

  constructor() {
    this.position = 0;
    this.fieldLength = -1;
    this.buffer = undefined;
    this.trailingNewLine = false;
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
        // this case ('\r') should fallthrough to NewLine '\n'
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
      const message = this.decodeText(resultBuf);
      list.push({ fieldLength: resultFieldLength, message });
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

  decodeText(bytes: Bytes): string {
    if (bytes == null) return '';
    if (typeof bytes === 'string') return bytes;

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
 * decode string lines to ServerSentEvent
 */
export class SSEDecoder {
  private data: string[];
  private event: string | null;
  private chunks: string[];

  constructor() {
    this.event = null;
    this.data = [];
    this.chunks = [];
  }


  public decode(line: string) {
    if (line.endsWith('\r')) {
      line = line.substring(0, line.length - 1);
    }
    if (!line) {
      // empty line and we didn't previously encounter any messages
      if (!this.event && !this.data.length) return null;

      const sse: ServerSentEvent = {
        event: this.event,
        data: this.data.join('\n'),
        raw: this.chunks,
      };

      this.event = null;
      this.data = [];
      this.chunks = [];

      return sse;
    }

    this.chunks.push(line);

    if (line.startsWith(':')) {
      return null;
    }
    // line is of format "<field>:<value>" or "<field>: <value>"
    const [fieldName, , value] = partition(line, ':');
    let str = value;
    if (value.startsWith(' ')) {
      str = value.substring(1);
    }

    if (fieldName === 'event') {
      this.event = str;
    } else if (fieldName === 'data') {
      this.data.push(str);
    }
    return null;
  }
}

function partition(str: string, delimiter: string): [string, string, string] {
  const index = str.indexOf(delimiter);
  if (index !== -1) {
    return [str.substring(0, index), delimiter, str.substring(index + delimiter.length)];
  }

  return [str, '', ''];
}
