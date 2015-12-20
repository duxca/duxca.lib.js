export declare class FourierTransform {
    bufferSize: number;
    sampleRate: number;
    bandwidth: number;
    spectrum: Float32Array;
    real: Float32Array;
    imag: Float32Array;
    peakBand: number;
    peak: number;
    constructor(bufferSize: number, sampleRate: number);
    /**
     * Calculates the *middle* frequency of an FFT band.
     *
     * @param {Number} index The index of the FFT band.
     *
     * @returns The middle frequency in Hz.
     */
    getBandFrequency(index: number): number;
    calculateSpectrum(): Float32Array;
}
/**
 * DFT is a class for calculating the Discrete Fourier Transform of a signal.
 *
 * @param {Number} bufferSize The size of the sample buffer to be computed
 * @param {Number} sampleRate The sampleRate of the buffer (eg. 44100)
 *
 * @constructor
 */
export declare class DFT extends FourierTransform {
    sinTable: Float32Array;
    cosTable: Float32Array;
    constructor(bufferSize: number, sampleRate: number);
    /**
     * Performs a forward transform on the sample buffer.
     * Converts a time domain signal to frequency domain spectra.
     *
     * @param {Array} buffer The sample buffer
     *
     * @returns The frequency spectrum array
     */
    forward(buffer: Float32Array): Float32Array;
}
/**
 * FFT is a class for calculating the Discrete Fourier Transform of a signal
 * with the Fast Fourier Transform algorithm.
 *
 * @param {Number} bufferSize The size of the sample buffer to be computed. Must be power of 2
 * @param {Number} sampleRate The sampleRate of the buffer (eg. 44100)
 *
 * @constructor
 */
export declare class FFT extends FourierTransform {
    reverseTable: Uint32Array;
    sinTable: Float32Array;
    cosTable: Float32Array;
    constructor(bufferSize: number, sampleRate: number);
    /**
     * Performs a forward transform on the sample buffer.
     * Converts a time domain signal to frequency domain spectra.
     *
     * @param {Array} buffer The sample buffer. Buffer Length must be power of 2
     *
     * @returns The frequency spectrum array
     */
    forward(buffer: Float32Array): Float32Array;
    inverse(real: Float32Array, imag: Float32Array): Float32Array;
}
/**
 * RFFT is a class for calculating the Discrete Fourier Transform of a signal
 * with the Fast Fourier Transform algorithm.
 *
 * This method currently only contains a forward transform but is highly optimized.
 *
 * @param {Number} bufferSize The size of the sample buffer to be computed. Must be power of 2
 * @param {Number} sampleRate The sampleRate of the buffer (eg. 44100)
 *
 * @constructor
 */
export declare class RFFT extends FourierTransform {
    trans: Float32Array;
    reverseTable: Float32Array;
    constructor(bufferSize: number, sampleRate: number);
    reverseBinPermute(dest: Float32Array, source: Float32Array): void;
    generateReverseTable(): void;
    forward(buffer: Float32Array): Float32Array;
}
