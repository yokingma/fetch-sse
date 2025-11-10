import { IFetchOptions } from './interface';
import { parseServerSentEvent } from './sse';
import { checkOk } from './utils';

export async function fetchEventData(url: string, options: IFetchOptions = {}): Promise<void> {
  const { method, data = null, headers = {}, signal, onMessage, onError, onOpen, onClose } = options;
  const defaultHeaders = {
    Accept: 'text/event-stream',
    'Content-Type': 'application/json'
  };
  const mergedHeaders = {
    ...defaultHeaders,
    ...headers
  };
  let body: BodyInit | null;
  if (isPlainObject(data)) {
    body = JSON.stringify(data as Record<string, any>);
  } else {
    body = data as (BodyInit | null);
  }
  try {
    const res = await fetch(url, {
      method,
      headers: mergedHeaders,
      body,
      signal: signal
    });
    onOpen?.(res);
    await checkOk(res);
    // consumes data
    if (typeof onMessage === 'function' && res.body) {
      await parseServerSentEvent(res.body, (event) => {
        onMessage(event);
      });
      onClose?.();
    }
  } catch (err: any) {
    onError?.(err);
  }
}

function isPlainObject(obj: any): boolean {
  if (obj === null || typeof obj !== 'object') {
    return false;
  }
  const proto = Object.getPrototypeOf(obj);
  return proto === Object.prototype || proto === null;
}
