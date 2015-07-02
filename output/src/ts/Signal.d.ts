/// <reference path="../../../tsd/dsp/dsp.d.ts" />
declare module duxca.lib.Signal {
    function normalize(arr: Float32Array, max_val?: number): Float32Array;
    function correlation(signalA: Float32Array, signalB: Float32Array, sampleRate?: number): Float32Array;
    function fft(signal: Float32Array, sampleRate?: number): [Float32Array, Float32Array, Float32Array];
    function createChirpSignal(pulse_length: number, downchirp?: boolean): Float32Array;
    function createBarkerCode(n: number): number[];
    function autocorr(arr: number[]): number[];
    function createBarkerCodedChirp(barkerCodeN: number, bitWithBinaryPower?: number): Float32Array;
}
