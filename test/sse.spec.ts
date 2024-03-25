import { LineDecoder } from '../src/sse';

describe('SSEDecoder', () => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

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
});
