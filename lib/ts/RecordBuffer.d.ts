/// <reference path="../../typings/tsd.d.ts" />
declare class RecordBuffer {
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
declare namespace RecordBuffer {
    function mergeBuffers(chBuffer: Float32Array[]): Float32Array;
    function interleave(chs: Float32Array[]): Float32Array;
    function float32ArrayToInt16Array(arr: Float32Array): Int16Array;
}
export = RecordBuffer;
