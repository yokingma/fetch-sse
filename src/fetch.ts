import { IFetchOptions } from './interface';
import { SSEDecoder } from './sse';

const sse = new SSEDecoder();

export const checkOk = async (response: Response): Promise<void> => {
  if (!response.ok) {
    const defaultMessage = `Error ${response.status}: ${response.statusText}`;
    let message = '';
    if (response.headers.get('content-type')?.includes('application/json')) {
      try {
        const errorData = await response.json();
        message = errorData.message || errorData.error || defaultMessage;
      } catch(error) {
        throw new Error('Failed to parse error response as JSON');
      }
    } else {
      try {
        const textData = await response.text();
        message = textData || defaultMessage;
      } catch(error) {
        throw new Error('Failed to parse error response as text');
      }
    }

    throw new Error(message);
  }
};
export async function fetchEventData(url: string, options: IFetchOptions = {}): Promise<void> {
  const { method, data, headers = {}, signal, onMessage, onError, onOpen, onClose } = options;
  const defaultHeaders = {
    Accept: 'text/event-stream',
    'Content-Type': 'application/json'
  };
  const mergedHeaders = {
    ...defaultHeaders,
    ...headers
  };
  try {
    const res = await fetch(url, {
      method,
      headers: mergedHeaders,
      body: JSON.stringify(data),
      signal: signal
    });
    await checkOk(res);
    onOpen?.(res);
    // consumes data
    if (typeof onMessage === 'function' && res.body) {
      const reader = res.body.getReader();
      while(true) {
        const { value, done } = await reader.read();
        if (done) break;
        const decoded = sse.decode(value);
        for (const event of decoded) {
          onMessage(event, done);
        }
      }
      onMessage(null, true);
      onClose?.();
    }
  } catch (err) {
    onError?.(err);
  }
}
