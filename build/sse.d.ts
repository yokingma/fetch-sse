import { Bytes, ServerSentEvent } from './interface';
export declare class SSEDecoder {
    private data;
    private event;
    private chunks;
    private lineDecoder;
    constructor();
    /**
     * @description decode string from sse stream
     */
    decode(chunk: Bytes): ServerSentEvent[];
    private parseTextLine;
    private clear;
}
