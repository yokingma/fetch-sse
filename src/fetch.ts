import { IFetchOptions } from './interface';
import { SSEDecoder } from './sse';

const sse = new SSEDecoder();
export async function fetchEventData(url: string, options: IFetchOptions = {}): Promise<void> {
  const { method, data, headers = {}, signal, onMessage, onError, onOpen, onClose } = options;
  Object.assign(headers, {
    Accept: 'text/event-stream',
    'Content-type': 'application/json',
  });
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(data),
      signal: signal
    });
    const reader = res.body?.getReader();
    onOpen?.(res);
    while(true) {
      if (!reader) break;
      const { value, done } = await reader.read();
      const decoded = sse.decode(value);
      onMessage?.(decoded, done);
      if (done) break;
    }
    onClose?.();
  } catch (err) {
    onError?.(err);
  }
}
