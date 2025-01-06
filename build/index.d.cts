type Bytes = ArrayBuffer | Uint8Array | Buffer;
interface ServerSentEvent {
    event: string | null;
    data: string;
    raw: string[];
}
interface IFetchOptions {
    method?: string;
    headers?: Headers | Record<string, any>;
    data?: BodyInit | Record<string, any> | null;
    signal?: AbortSignal;
    onMessage?: (event: ServerSentEvent | null, done?: boolean) => void;
    onOpen?: (res?: Response) => void;
    onClose?: () => void;
    onError?: (error: any) => void;
}
interface LinesResult {
    fieldLength: number;
    line: Uint8Array;
}

declare function fetchEventData(url: string, options?: IFetchOptions): Promise<void>;

export { type Bytes, type IFetchOptions, type LinesResult, type ServerSentEvent, fetchEventData };
