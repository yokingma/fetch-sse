import { Bytes, ServerSentEvent } from './interface';

// prettier-ignore
const NEWLINE_CHARS = new Set(['\n', '\r']);
// const NEWLINE_CHARS = new Set(['\n', '\r', '\x0b', '\x0c', '\x1c', '\x1d', '\x1e', '\x85', '\u2028', '\u2029']);
// eslint-disable-next-line no-control-regex
const NEWLINE_REGEXP = /\r\n|[\n\r]/g;
// const NEWLINE_REGEXP = /\r\n|[\n\r\x0b\x0c\x1c\x1d\x1e\x85\u2028\u2029]/g;

export async function parseServerSentEvent(stream: ReadableStream<Uint8Array>, onMessage: (event: ServerSentEvent) => void) {
  const decoder = new SSEDecoder();

  await getBytes(stream, (chunk: Uint8Array) => {
    const lineDecoder = new LineDecoder();
    // raw string lines
    const lines = lineDecoder.decode(chunk);

    for (const line of lines) {
      const sseData = decoder.decode(line);
      if (sseData) {
        onMessage(sseData);
      }
    }
  
    for (const line of lineDecoder.flush()) {
      const sseData = decoder.decode(line);
      if (sseData) onMessage(sseData);
    }
  });
}

/**
 * Converts a ReadableStream into a callback pattern.
 * @param stream The input ReadableStream.
 * @param onChunk A function that will be called on each new byte chunk in the stream.
 * @returns A promise that will be resolved when the stream closes.
 */
export async function getBytes(stream: ReadableStream<Uint8Array>, onChunk: (arr: Uint8Array) => void) {
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(value);
  }
}

/**
 * from openai sdk.
 * A re-implementation of http[s]'s `LineDecoder` that handles incrementally
 * reading lines from text.
 *
 * https://github.com/encode/httpx/blob/920333ea98118e9cf617f246905d7b202510941c/httpx/_decoders.py#L258
 */
export class LineDecoder {
  buffer: string[];
  trailingCR: boolean;
  // TextDecoder found in browsers; not typed to avoid pulling in either "dom" or "node" types.
  textDecoder: any;

  constructor() {
    this.buffer = [];
    this.trailingCR = false;
  }

  decode(chunk: Bytes): string[] {
    let text = this.decodeText(chunk);

    // end with Carriage Return
    if (this.trailingCR) {
      text = '\r' + text;
      this.trailingCR = false;
    }
    if (text.endsWith('\r')) {
      this.trailingCR = true;
      text = text.slice(0, -1);
    }

    if (!text) {
      return [];
    }

    const trailingNewline = NEWLINE_CHARS.has(text[text.length - 1] || '');
    let lines = text.split(NEWLINE_REGEXP);

    if (lines.length === 1 && !trailingNewline) {
      this.buffer.push(lines[0]!);
      return [];
    }

    if (this.buffer.length > 0) {
      lines = [this.buffer.join('') + lines[0], ...lines.slice(1)];
      this.buffer = [];
    }

    if (!trailingNewline) {
      this.buffer = [lines.pop() || ''];
    }

    return lines;
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
        this.textDecoder ??= new TextDecoder('utf8');
        return this.textDecoder.decode(bytes);
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

  flush(): string[] {
    if (!this.buffer.length && !this.trailingCR) {
      return [];
    }

    const lines = [this.buffer.join('')];
    this.buffer = [];
    this.trailingCR = false;
    return lines;
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
