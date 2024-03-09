export type Bytes = string | ArrayBuffer | Uint8Array | Buffer | null | undefined;

export interface ServerSentEvent {
  event: string | null;
  data: string;
  raw: string[];
}

export interface IFetchOptions {
  method?: string;
  headers?: HeadersInit;
  data?: Record<string, any>;
  signal?: AbortSignal;
  onMessage?: (event: ServerSentEvent | null, done?: boolean) => void;
  onOpen?: (res?: Response) => void;
  onClose?: () => void;
  onError?: (error: any) => void;
}
