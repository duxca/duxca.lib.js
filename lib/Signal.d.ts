/// <reference path="../typings/tsd.d.ts" />
import _Render = require("./Render");
export declare var Render: typeof _Render;
export declare function normalize(arr: Float32Array, max_val?: number): Float32Array;
export declare function correlation(signalA: Float32Array, signalB: Float32Array, sampleRate?: number): Float32Array;
export declare function smartCorrelation(short: Float32Array, long: Float32Array, sampleRate?: number): Float32Array;
export declare function overwarpCorr(short: Float32Array, long: Float32Array): Float32Array;
export declare function autocorr(arr: number[]): number[];
export declare function crosscorr(arrA: number[], arrB: number[]): number[];
export declare function fft(signal: Float32Array, sampleRate?: number): {
    real: Float32Array;
    imag: Float32Array;
    spectrum: Float32Array;
};
export declare function ifft(pulse_real: Float32Array, pulse_imag: Float32Array, sampleRate?: number): Float32Array;
export declare function createChirpSignal(pulse_length: number, downchirp?: boolean): Float32Array;
export declare function createBarkerCode(n: number): number[];
export declare function createComplementaryCode(pow2: number): number[][];
export declare function createCodedChirp(code: number[], bitWithBinaryPower?: number): Float32Array;
export declare function createBarkerCodedChirp(barkerCodeN: number, bitWithBinaryPower?: number): Float32Array;
export declare function createM(polynomial: number[], shiftN: number, seed?: number[]): number[];
export declare function mseqGen(MSEQ_POL_LEN: number, MSEQ_POL_COEFF: number[]): Float32Array;
export declare function fft_correlation(signalA: Float32Array, signalB: Float32Array): Float32Array;
export declare function fft_convolution(signalA: Float32Array, signalB: Float32Array): Float32Array;
export declare function naive_correlation(xs: number[], ys: number[]): number[];
export declare function naive_convolution(xs: number[], ys: number[]): number[];
export declare function phase_only_filter(xs: Float32Array, ys: Float32Array): Float32Array;
