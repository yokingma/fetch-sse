import { IFetchOptions } from './interface';
import { parseServerSentEvent } from './sse';
import { checkOk } from './utils';

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
        const decoded = parseServerSentEvent(value);
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
