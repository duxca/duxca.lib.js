declare type NumberArray = number[]
  //|Uint8ClampedArray
  |Uint8Array|Uint16Array|Uint32Array
  |Int8Array|Int16Array|Int32Array
  |Float32Array|Float64Array;
declare class FFT {
  constructor (bufferSize: number, sampleRate: number);
  forward(input: NumberArray): void;
  inverse(real: NumberArray, imag: NumberArray): Float32Array;
  spectrum: Float32Array;
  real: Float32Array;
  imag: Float32Array;
}
