import { checkOk } from '../src/utils';

describe('utils', () => {
  test('should do nothing for ok responses', async () => {
    const response = new Response('ok', {
      status: 200
    });

    await expect(checkOk(response)).resolves.toBeUndefined();
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

  test('should read the message field from a JSON error response', async () => {
    const response = new Response(JSON.stringify({ message: 'Bad request' }), {
      status: 400,
      statusText: 'Bad Request',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    await expect(checkOk(response)).rejects.toThrow('Bad request');
  });

  test('should read the error field from a JSON error response', async () => {
    const response = new Response(JSON.stringify({ error: 'Validation failed' }), {
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    await expect(checkOk(response)).rejects.toThrow('Validation failed');
  });

  test('should stringify non-string JSON error payloads', async () => {
    const response = new Response(JSON.stringify({ error: { code: 'BAD_INPUT' } }), {
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    await expect(checkOk(response)).rejects.toThrow(JSON.stringify({ code: 'BAD_INPUT' }));
  });

  test('should fall back to the default message when JSON payload has no message fields', async () => {
    const response = new Response(JSON.stringify({ reason: 'missing' }), {
      status: 403,
      statusText: 'Forbidden',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    await expect(checkOk(response)).rejects.toThrow('Error 403: Forbidden');
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

  test('should use non-empty text responses as the error message', async () => {
    const response = new Response('server exploded', {
      status: 500,
      statusText: 'Internal Server Error'
    });

    await expect(checkOk(response)).rejects.toThrow('server exploded');
  });

  test('should catch text parsing errors', async () => {
    const response = {
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      headers: new Headers(),
      text: async () => {
        throw new Error('boom');
      }
    } as unknown as Response;

    await expect(checkOk(response)).rejects.toThrow('Failed to parse error response as text');
  });
});
