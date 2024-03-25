import { ServerSentEvent, LinesResult } from './interface';
export declare const NewLineChars: {
    NewLine: number;
    CarriageReturn: number;
    Space: number;
    Colon: number;
};
export declare function parseServerSentEvent(stream: ReadableStream<Uint8Array>, onMessage: (event: ServerSentEvent) => void): Promise<void>;
/**
 * decode string lines to ServerSentEvent
 */
export declare class MessageDecoder {
    private data;
    private event;
    private chunks;
    constructor();
    decode(line: Uint8Array, filedLength: number): ServerSentEvent | undefined;
    private decodeText;
}
/**
 * Parses any byte chunks into EventSource line buffers.
 */
export declare class LineDecoder {
    private buffer;
    private position;
    private fieldLength;
    private trailingNewLine;
    constructor();
    getLines(chunk: Uint8Array): LinesResult[];
}
