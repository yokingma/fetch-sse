import { LineDecoder, MessageDecoder, parseServerSentEvent } from '../src/sse';

describe('SSEDecoder', () => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const createStream = (chunks: Array<string | Uint8Array>) => {
    return new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(typeof chunk === 'string' ? encoder.encode(chunk) : chunk);
        }
        controller.close();
      }
    });
  };

  const parseEvents = async (chunks: Array<string | Uint8Array>) => {
    const messages = [];

    await parseServerSentEvent(createStream(chunks), (event) => {
      messages.push(event);
    });

    return messages;
  };

  const parseString = (str: string) => {
    const parse = new LineDecoder();
    const encode = encoder.encode(str);
    return parse.getLines(encode).map(item => {
      return {
        message: decoder.decode(item.line),
        fieldLength: item.fieldLength
      };
    });
  };

  const parseValue = (str: string) => {
    const messageDecoder = new MessageDecoder();
    const encode = encoder.encode(str);
    const lineDecoder = new LineDecoder();
    const lines = lineDecoder.getLines(encode);
    const result: string[] = [];
    for (const item of lines) {
      const source = messageDecoder.decode(item.line, item.fieldLength);
      if (source?.data) result.push(source.data);
    }
    return result;
  };

  const parseMultiple = (arr: string[]) => {
    const parse = new LineDecoder();
    const list = [];
    for (const str of arr) {
      const encode = encoder.encode(str);
      list.push(...parse.getLines(encode));
    }
    return list.map(item => {
      return {
        message: decoder.decode(item.line),
        fieldLength: item.fieldLength
      };
    });
  };

  test('extract value with "space"', () => {
    expect(parseValue('data: foo bar \n\n')).toEqual(['foo bar ']);
  });

  test('extract value with "no space"', () => {
    expect(parseValue('data:foo bar \n\n')).toEqual(['foo bar ']);
  });

  test('basic \n', () => {
    expect(parseString('id: foo bar \n')).toEqual([{ message: 'id: foo bar ', fieldLength: 2 }]);
  });

  test('basic with \r', () => {
    expect(parseString('data: foo bar\r')).toEqual([{ message: 'data: foo bar', fieldLength: 4 }]);
  });

  test('basic with \r\n', () => {
    expect(parseString('data: foo bar\r\n')).toEqual([{ message: 'data: foo bar', fieldLength: 4 }]);
  });

  test('should escape "\\n"', () => {
    expect(parseString('id: foo \\n bar \n')).toEqual([{ message: 'id: foo \\n bar ', fieldLength: 2 }]);
  });

  test('should escape "\\r"', () => {
    expect(parseString('id: foo \\r bar \n')).toEqual([{ message: 'id: foo \\r bar ', fieldLength: 2 }]);
  });

  test('multiple lines', () => {
    const list = parseMultiple(['id:1\n', 'data: 1234\n']);
    expect(list[0]).toEqual({ message: 'id:1', fieldLength: 2 });
    expect(list[1]).toEqual({ message: 'data: 1234', fieldLength: 4 });
  });

  test('multiple lines split across multiple arrays', () => {
    const list = parseMultiple(['id: 1', '23\nda', 'ta: 456\n']);
    expect(list[0]).toEqual({ message: 'id: 123', fieldLength: 2 });
    expect(list[1]).toEqual({ message: 'data: 456', fieldLength: 4 });
  });

  test('comment line', () => {
    expect(parseString(': 123\n')).toEqual([{ message: ': 123', fieldLength: 0 }]);
  });

  test('single line split across multiple arrays', () => {
    const list = parseMultiple(['id: 1', '23', '456\n']);
    expect(list[0]).toEqual({ message: 'id: 123456', fieldLength: 2 });
  });

  test('line with multiple colons', () => {
    expect(parseString('id: 123: 456\n')).toEqual([{ message: 'id: 123: 456', fieldLength: 2 }]);
  });

  test('single byte array with multiple lines separated by \\n', () => {
    const list = parseString('id: abc\ndata: def\n');
    for (let i = 0; i < list.length; i++) {
      expect(list[i].message).toEqual(i === 0 ? 'id: abc' : 'data: def');
    }
  });

  test('single byte array with multiple lines separated by \\r', () => {
    const list = parseString('id: abc\rdata: def\r');
    for (let i = 0; i < list.length; i++) {
      expect(list[i].message).toEqual(i === 0 ? 'id: abc' : 'data: def');
    }
  });

  test('single byte array with multiple lines separated by \\r\\n', () => {
    const list = parseString('id: abc\r\ndata: def\r\n');
    for (let i = 0; i < list.length; i++) {
      expect(list[i].message).toEqual(i === 0 ? 'id: abc' : 'data: def');
    }
  });

  test('preserves message state when a single SSE event spans multiple chunks', async () => {
    const messages = await parseEvents(['event: ping\n', 'data: one\ndata: two\n\n']);

    expect(messages).toEqual([
      {
        event: 'ping',
        data: 'one\ntwo',
        raw: ['ping', 'one', 'two']
      }
    ]);
  });

  test.each([
    ['blank block', ['\n\n']],
    ['comment-only block', [': keepalive\n\n']],
    ['id-only block', ['id: 1\n\n']],
    ['event-only block', ['event: ping\n\n']],
    ['retry-only block', ['retry: 5000\n\n']],
  ])('does not emit messages for %s', async (_name, chunks: Array<string | Uint8Array>) => {
    await expect(parseEvents(chunks)).resolves.toEqual([]);
  });

  test('treats a field without a colon as an empty-value field', async () => {
    await expect(parseEvents(['data\ndata\n\n'])).resolves.toEqual([
      {
        event: null,
        data: '\n',
        raw: ['', '']
      }
    ]);
  });

  test('resets the event name when receiving an empty event field', async () => {
    await expect(parseEvents(['event: ping\nevent\ndata: hi\n\n'])).resolves.toEqual([
      {
        event: null,
        data: 'hi',
        raw: ['ping', '', 'hi']
      }
    ]);
  });

  test('ignores one leading UTF-8 BOM before parsing fields', async () => {
    const bomPrefixedData = new Uint8Array([0xEF, 0xBB, 0xBF, ...encoder.encode('data: hi\n\n')]);

    await expect(parseEvents([bomPrefixedData])).resolves.toEqual([
      {
        event: null,
        data: 'hi',
        raw: ['hi']
      }
    ]);
  });

  test('ignores a UTF-8 BOM that is split across multiple chunks', async () => {
    const finalChunk = new Uint8Array([0xBF, ...encoder.encode('data: hi\n\n')]);

    await expect(parseEvents([
      new Uint8Array([0xEF]),
      new Uint8Array([0xBB]),
      finalChunk
    ])).resolves.toEqual([
      {
        event: null,
        data: 'hi',
        raw: ['hi']
      }
    ]);
  });

  test('decodes Buffer-backed lines in Node environments', () => {
    const messageDecoder = new MessageDecoder();

    expect(messageDecoder.decode(Buffer.from('data: hi'), 4)).toBeUndefined();
    expect(messageDecoder.decode(Buffer.from(''), -1)).toEqual({
      event: null,
      data: 'hi',
      raw: ['hi']
    });
  });
});
