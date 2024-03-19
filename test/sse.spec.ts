import { SSEDecoder } from '../src/sse';
import { checkOk } from '../src/fetch';

const decoder = new SSEDecoder();

describe('SSEDecoder', () => {  
  test('should decode data-only messages', () => {
    const raw = '{"username": "bobby", "time": "02:33:48"}';
    const line = `data: ${raw}`;
    const buf = Buffer.from(`${line}\n\n`, 'utf-8');
    const data = decoder.decode(buf)[0];
    expect(data).toEqual({
      event: null,
      data: raw,
      raw: [line]
    });
  });

  test('should decode named events', () => {
    const raw = '{"username": "bobby", "time": "02:33:48"}';
    const lines = `:HTTP 1.1\nid: 1\nevent: result\ndata: ${raw}`;
    const buf = Buffer.from(`${lines}\n\n`, 'utf-8');
    const data = decoder.decode(buf)[0];
    expect(data).toEqual({
      event: 'result',
      data: raw,
      raw: [
        ':HTTP 1.1',
        'id: 1',
        'event: result',
        `data: ${raw}`
      ]
    });
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
