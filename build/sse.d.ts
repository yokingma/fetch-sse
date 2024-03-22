import { Bytes, ServerSentEvent } from './interface';
export declare function parseServerSentEvent(stream: ReadableStream<Uint8Array>, onMessage: (event: ServerSentEvent) => void): Promise<void>;
/**
 * Converts a ReadableStream into a callback pattern.
 * @param stream The input ReadableStream.
 * @param onChunk A function that will be called on each new byte chunk in the stream.
 * @returns A promise that will be resolved when the stream closes.
 */
export declare function getBytes(stream: ReadableStream<Uint8Array>, onChunk: (arr: Uint8Array) => void): Promise<void>;
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
