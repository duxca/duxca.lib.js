declare module duxca.lib {
    class RecordBuffer {
        sampleRate: number;
        bufferSize: number;
        channel: number;
        maximamRecordSize: number;
        chsBuffers: Float32Array[][];
        sampleTimes: number[];
        count: number;
        constructor(sampleRate: number, bufferSize: number, channel: number, maximamRecordSize?: number);
        clear(): void;
        add(chsBuffer: Float32Array[], currentTime: number): void;
        toPCM(): Int16Array;
        merge(ch?: number): Float32Array;
        getChannelData(n: number): Float32Array;
    }
}
