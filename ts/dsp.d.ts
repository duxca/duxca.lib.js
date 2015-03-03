

declare class FFT {
  constructor (bufferSize: number, sampleRate: number);
  forward(input: Float32Array): void;
  inverse(real: Float32Array, imag: Float32Array): Float32Array;
  spectrum: Float32Array;
  real: Float32Array;
  imag: Float32Array;
}
