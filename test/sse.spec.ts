import { LineDecoder } from '../src/sse';
import { checkOk } from '../src/utils';

describe('SSEDecoder', () => {
  const encoder = new TextEncoder();

  test('basic \n', () => {
    const parse = new LineDecoder();
    expect(parse.getLines(encoder.encode('id: foo bar \n'))).toEqual([{ message: 'id: foo bar ', fieldLength: 2 }]);
  });

  test('basic with \r', () => {
    const parse = new LineDecoder();
    expect(parse.getLines(encoder.encode('data: foo bar\r'))).toEqual([{ message: 'data: foo bar', fieldLength: 4 }]);
  });

  test('basic with \r\n', () => {
    const parse = new LineDecoder();
    expect(parse.getLines(encoder.encode('data: foo bar\r\n'))).toEqual([{ message: 'data: foo bar', fieldLength: 4 }]);
  });

  test('should escape "\\n"', () => {
    const parse = new LineDecoder();
    expect(parse.getLines(encoder.encode('id: foo \\n bar \n'))).toEqual([{ message: 'id: foo \\n bar ', fieldLength: 2 }]);
  });

  test('should escape "\\r"', () => {
    const parse = new LineDecoder();
    expect(parse.getLines(encoder.encode('id: foo \\r bar \n'))).toEqual([{ message: 'id: foo \\r bar ', fieldLength: 2 }]);
  });

  test('multiple lines', () => {
    const parse = new LineDecoder();
    expect(parse.getLines(encoder.encode('id:1\n'))).toEqual([{ message: 'id:1', fieldLength: 2 }]);
    expect(parse.getLines(encoder.encode('data: 1234\n'))).toEqual([{ message: 'data: 1234', fieldLength: 4 }]);
  });
  
  test('single line split across multiple arrays', () => {
    const parse = new LineDecoder();
    expect(parse.getLines(encoder.encode('id: 1'))).toEqual([]);
    expect(parse.getLines(encoder.encode('23'))).toEqual([]);
    expect(parse.getLines(encoder.encode('456\n'))).toEqual([{ message: 'id: 123456', fieldLength: 2 }]);
  });

  test('multiple lines split across multiple arrays', () => {
    const parse = new LineDecoder();
    expect(parse.getLines(encoder.encode('id: 1'))).toEqual([]);
    expect(parse.getLines(encoder.encode('23\nda'))).toEqual([{ message: 'id: 123', fieldLength: 2 }]);
    expect(parse.getLines(encoder.encode('ta: 456\n'))).toEqual([{ message: 'data: 456', fieldLength: 4 }]);
  });

  test('comment line', () => {
    const parse = new LineDecoder();
    expect(parse.getLines(encoder.encode(': 123\n'))).toEqual([{ message: ': 123', fieldLength: 0 }]);
  });

  test('line with multiple colons', () => {
    const parse = new LineDecoder();
    expect(parse.getLines(encoder.encode('id: 123: 456\n'))).toEqual([{ message: 'id: 123: 456', fieldLength: 2 }]);
  });

  test('single byte array with multiple lines separated by \\n', () => {
    const parse = new LineDecoder();
    const line = encoder.encode('id: abc\ndef\n');
    const list = parse.getLines(line);
    for (let i = 0; i < list.length; i++) {
      expect(list[i].message).toEqual(i === 0 ? 'id: abc' : 'data: def');
    }
  });

  test('single byte array with multiple lines separated by \\r', () => {
    const parse = new LineDecoder();
    const line = encoder.encode('id: abc\rdata: def\r');
    const list = parse.getLines(line);
    for (let i = 0; i < list.length; i++) {
      expect(list[i].message).toEqual(i === 0 ? 'id: abc' : 'data: def');
    }
  });

  test('single byte array with multiple lines separated by \\r\\n', () => {
    const parse = new LineDecoder();
    const line = encoder.encode('id: abc\r\ndata: def\r\n');
    const list = parse.getLines(line);
    for (let i = 0; i < list.length; i++) {
      expect(list[i].message).toEqual(i === 0 ? 'id: abc' : 'data: def');
    }
  });

  // test('should escape new lines with \\r\\n', () => {
  //   expect(decodeChunks('foo\\r\\nbaz')).toEqual('foo\\r\\nbaz');
  // });

  test('should catch JSON.parse error of response', async () => {
    const response = new Response(null, {
      status: 422,
      statusText: 'Invalid parameters',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    try {
      await checkOk(response);
    } catch(error: any) {
      expect(error?.message).toEqual('Failed to parse error response as JSON');
    }    
  });

  test('should catch text error of response', async () => {
    const response = new Response(null, {
      status: 422,
      statusText: 'Invalid parameters'
    });
    try {
      await checkOk(response);
    } catch(error: any) {
      expect(error?.message).toEqual('Error 422: Invalid parameters');
    }    
  });  
});
