# Fetch SSE (Server-Sent Events)
This package provides an easy API for making Event Source requests with all the features of Fetch API, and supports browsers and nodejs.

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

You can pass in other parameters in a similar way to the Fetch API.
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
    console.log(event.data);
  }
})
```

Interface

```ts
export interface IFetchOptions {
  method?: string;
  headers?: HeadersInit | Record<string, any>;
  data?: Record<string, any>;
  signal?: AbortSignal;
  onMessage?: (event: ServerSentEvent | null, done?: boolean) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: any) => void;
}

// decoded event
export interface ServerSentEvent {
  event: string | null;
  data: string;
  raw: string[];
}
```

# Event stream pattern
The event stream is a simple stream of text data that encoded using UTF-8. You can find more information [here](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events).

* **Data-only messages**

raw:
```text

data: {"username": "bobby", "time": "02:33:48"}\n\n
```
parsed:
```js
{
  event: null,
  data: '{"username": "bobby", "time": "02:33:48"}',
  raw: [
    'data: {"username": "bobby", "time": "02:33:48"}'
  ]
}
```
* **Named events**

raw:
```text
:HTTP\n
id: 1\n
event: result\n
data: {"username": "bobby", "time": "02:33:48"}\n\n
```

parsed:

```js
{
  event: 'result',
  data: {"username": "bobby", "time": "02:33:48"},
  raw: [
    ':HTTP',
    'id: 1',
    'event: result',
    'data: {"username": "bobby", "time": "02:33:48"}'
  ]
}
```

# Compatibility

this package is written in typescript and compatible with browsers and nodejs, You might need to [polyfill TextDecoder](https://www.npmjs.com/package/fast-text-encoding) for old versions of browsers.
