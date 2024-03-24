import { LineDecoder } from '../src/sse';
import { checkOk } from '../src/utils';

function decodeChunks(chunks: string[]) {
  const decoder = new LineDecoder();
  const lines: string[] = [];
  for (const chunk of chunks) {
    lines.push(...decoder.decode(chunk));
  }
  for (const line of decoder.flush()) {
    lines.push(line);
  }
  return lines;
}

describe('SSEDecoder', () => {
  test('basic \n', () => {
    expect(decodeChunks(['foo', ' bar\nbaz'])).toEqual(['foo bar', 'baz']);
  });

  test('basic with \r', () => {
    expect(decodeChunks(['foo', ' bar\rbaz'])).toEqual(['foo bar', 'baz']);
  });

  test('basic with \r\n', () => {
    expect(decodeChunks(['foo', ' bar\r\nbaz'])).toEqual(['foo bar', 'baz']);
  });

  test('should escape new lines \\n', () => {
    expect(decodeChunks(['foo \\nbaz'])).toEqual(['foo \\nbaz']);
  });
  
  test('should escape new lines with \\r', () => {
    expect(decodeChunks(['foo\\n \\rbaz'])).toEqual(['foo\\n \\rbaz']);
  });

  test('should escape new lines with \\r\\n', () => {
    expect(decodeChunks(['foo\\r\\nbaz'])).toEqual(['foo\\r\\nbaz']);
  });

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
