import { Bytes, ServerSentEvent } from './interface';
export declare function parseServerSentEvent(chunk: Bytes): ServerSentEvent[] | [];
/**
 * from openai sdk.
 * A re-implementation of http[s]'s `LineDecoder` that handles incrementally
 * reading lines from text.
 *
 * https://github.com/encode/httpx/blob/920333ea98118e9cf617f246905d7b202510941c/httpx/_decoders.py#L258
 */
export declare class LineDecoder {
    buffer: string[];
    trailingCR: boolean;
    textDecoder: any;
    constructor();
    decode(chunk: Bytes): string[];
    decodeText(bytes: Bytes): string;
    flush(): string[];
}
/**
 * decode string lines to ServerSentEvent
 */
export declare class SSEDecoder {
    private data;
    private event;
    private chunks;
    constructor();
    decode(line: string): ServerSentEvent | null;
}
