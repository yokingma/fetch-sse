import { ServerSentEvent } from './interface';
export declare class SSEDecoder {
    private data;
    private event;
    private chunks;
    private lineDecoder;
    constructor();
    /**
     * @description decode string from sse stream
     */
    decode(arrayBuf?: ArrayBuffer | null): ServerSentEvent | null;
    private lineDecode;
}
