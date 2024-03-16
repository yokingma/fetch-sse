import { SSEDecoder } from '../src/sse';

const decoder = new SSEDecoder();

describe('SSEDecoder', () => {  
  test('should decode data-only messages', () => {
    const data = '{"username": "bobby", "time": "02:33:48"}';
    const line = `data: ${data}`;
    const buf = Buffer.from(`${line}\n\n`, 'utf-8');
    const event = decoder.decode(buf);
    expect(event).toEqual({
      event: null,
      data,
      raw: [line]
    });
  });

  test('should decode named events', () => {
    const data = '{"username": "bobby", "time": "02:33:48"}';
    const lines = `:HTTP 1.1\nid: 1\nevent: result\ndata: ${data}`;
    const buf = Buffer.from(`${lines}\n\n`, 'utf-8');
    const event = decoder.decode(buf);
    expect(event).toEqual({
      event: 'result',
      data,
      raw: [
        ':HTTP 1.1',
        'id: 1',
        'event: result',
        `data: ${data}`
      ]
    });
  });

});
