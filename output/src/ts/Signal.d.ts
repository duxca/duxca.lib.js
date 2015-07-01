/// <reference path="../../../tsd/dsp/dsp.d.ts" />
declare module duxca.lib.Signal {
    function standard(arr: Float32Array, max_val?: number): Float32Array;
    function correlation(signalA: Float32Array, signalB: Float32Array, sampleRate?: number): Float32Array;
    function fft(signal: Float32Array, sampleRate?: number): [Float32Array, Float32Array, Float32Array];
    function createChirpSignal(pulse_length: number): Float32Array;
}
