# Fetch SSE (Server-Sent Events)

This package provides an easy API for making Event Source requests with all the features of Fetch API, and supports browsers and Node.js.

> For Node.js, v18.0.0 or higher required.

## Install

```sh
npm install fetch-sse
```

## Usage

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
  // or JSON.stringify({ foo: 'bar' })
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

### Skip Status Check

By default, the library checks if the response status is OK (2xx) before calling `onOpen`. If you need to handle custom status codes or want to process the response regardless of the status, you can use the `skipStatusCheck` option:

```ts
await fetchEventData('/api/sse', {
  skipStatusCheck: true,
  onOpen: (res) => {
    // This will be called even if status is not 2xx
    console.log('Response status:', res.status);
    if (res.status === 299) {
      // Handle custom status code
    }
  },
  onMessage: (event) => {
    console.log(event.data);
  }
})
```

When `skipStatusCheck` is `true`, `onOpen` will be called before any status validation, allowing you to handle the response yourself.

Interface

```ts

// fetch options
export interface IFetchOptions {
  method?: string;
  headers?: HeadersInit | Record<string, any>;
  data?: BodyInit | Record<string, any> | null;
  signal?: AbortSignal;
  skipStatusCheck?: boolean;
  onMessage?: (event: ServerSentEvent | null, done?: boolean) => void;
  onOpen?: (res?: Response) => void;
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

## Event stream pattern

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

## Compatibility

this package is written in typescript and compatible with browsers and nodejs, You might need to [polyfill TextDecoder](https://www.npmjs.com/package/fast-text-encoding) for old versions of browsers.
