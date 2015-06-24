declare module duxca.lib {
    class RecordBuffer {
        bufferSize: number;
        channel: number;
        maximamRecordSize: number;
        chsBuffers: Float32Array[][];
        lastTime: number;
        count: number;
        constructor(bufferSize: number, channel: number, maximamRecordSize?: number);
    }
}
