/// <reference types="node" />
export type Bytes = ArrayBuffer | Uint8Array | Buffer;
export interface ServerSentEvent {
    event: string | null;
    data: string;
    raw: string[];
}
export interface IFetchOptions {
    method?: string;
    headers?: HeadersInit | Record<string, any>;
    data?: Record<string, any>;
    signal?: AbortSignal;
    onMessage?: (event: ServerSentEvent | null, done?: boolean) => void;
    onOpen?: (res?: Response) => void;
    onClose?: () => void;
    onError?: (error: any) => void;
}
export interface LinesResult {
    fieldLength: number;
    line: Uint8Array;
}
