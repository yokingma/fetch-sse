# Fetch SSE (Server-Sent Events)
This package provides a easy API for making Event Source requests with all the features of Fetch API, and supports browsers and nodejs.

# Install
```
npm install fetch-sse
```
# Usage

```ts
import { fetchEventData } from 'fetch-sse';
await fetchEventData('/api/sse', {
  method: 'POST',
  data: { foo: 'bar' },
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token'
  },
  onMessage: (event) => {
    console.log(event);
  }
})
```

You can pass in all the other parameters exposed by Fetch API.
```ts
import { fetchEventData } from 'fetch-sse';
await fetchEventData('/api/sse', {
  method: 'POST',
  data: { foo: 'bar' },
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token'
  },
  signal: ctrl.signal,
  onMessage: (event) => {
    console.log(event);
  }
})
```

interface

```ts
export interface IFetchOptions {
  method?: string;
  headers?: HeadersInit;
  data?: Record<string, any>;
  signal?: AbortSignal;
  onMessage?: (event: ServerSentEvent | null, done?: boolean) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: any) => void;
}
```

# Compatibility

this package is written in typescript and compatible with browsers and nodejs, You might need to [polyfill TextDecoder](https://www.npmjs.com/package/fast-text-encoding) for old versions of browsers.
