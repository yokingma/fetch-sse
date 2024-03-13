import { IFetchOptions } from './interface';
import { SSEDecoder } from './sse';

const sse = new SSEDecoder();
export async function fetchEventData(url: string, options: IFetchOptions = {}): Promise<void> {
  const { method, data, headers = {}, signal, onMessage, onError, onOpen, onClose } = options;
  const mergedHeaders = Object.assign({}, headers, {
    Accept: 'text/event-stream'
  });
  try {
    const res = await fetch(url, {
      method,
      headers: mergedHeaders,
      body: JSON.stringify(data),
      signal: signal
    });
    onOpen?.(res);
    // consumes data
    if (typeof onMessage === 'function') {
      const reader = res.body?.getReader();
      while(true) {
        if (!reader) break;
        const { value, done } = await reader.read();
        const decoded = sse.decode(value);
        onMessage(decoded, done);
        if (done) break;
      }
      onClose?.();
    }
  } catch (err) {
    onError?.(err);
  }
}
