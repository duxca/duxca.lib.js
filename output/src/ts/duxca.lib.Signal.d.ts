/// <reference path="../../../thirdparty/dsp/dsp.d.ts" />
declare module duxca.lib.Signal {
    function indexToFreq(index: number, sampleRate: number, fftSize: number): number;
    function freqToIndex(freq: number, sampleRate: number, fftSize: number): number;
    function timeToIndex(sampleRate: number, time: number): number;
    function indexToTime(sampleRate: number, currentIndex: number): number;
    function calcCorr(signal: Float32Array, input: Float32Array, sampleRate?: number): Float32Array;
}
